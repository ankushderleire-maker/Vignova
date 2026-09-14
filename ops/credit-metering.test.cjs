// Every route that calls a model must charge the bucket the pricing page says
// it does, reserve that credit before the model runs, and give it back when the
// model fails. Prices come from lib/planCatalog.ts, the table the billing page
// renders, so a route that drifts from the page fails here.
//
// Run: node --test ops/credit-metering.test.cjs
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const app=path.resolve(__dirname,'../resume-saas-v4');
const appRequire=require('node:module').createRequire(path.join(app,'package.json'));
const ts=appRequire('typescript');
function load(file,overrides={}){const filename=path.join(app,file),module={exports:{}};const {outputText}=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}});vm.runInThisContext('(function(require,module,exports){'+outputText+'\n})',{filename})(name=>Object.hasOwn(overrides,name)?overrides[name]:appRequire(name),module,module.exports);return module.exports;}

const catalog=load('lib/planCatalog.ts');
const USER='00000000-0000-4000-8000-000000000002';
const session={getServerSession:async()=>({user:{id:USER,email:'person@example.test'}})};
const auth={authOptions:{}};
const post=body=>new Request('https://app.vignova.io/api/test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
const REPLIES={
    '/api/generate-tailored-resume':{data:{fullName:'Example Person',summary:'Engineer'}},
    '/api/generate-cover-letter':{response:'Dear Hiring Manager,'},
    '/api/generate-draft-email':{response:'Subject: Application'},
    '/api/interview/questions':{questions:[{question:'How do you test a payment flow?'}]},
    '/api/linkedin/optimize':{headline:'Backend engineer'},
    '/api/enhance-ats-report':{summary:'Strong match'},
};

function harness({plan='PRO',balances={tailoring:5,writing:5,interview:5},flags={},fail=[]}={}){
    const start={...balances},state={...balances},calls=[];
    const limits={plan_type:plan,tailoring:50,writing:100,interview:5,max_profiles:5,has_extension_access:true,has_multi_profile:true,has_unlimited_resumes:false,has_linkedin_optimization:true,has_interview_prep:true,...flags};
    const credits={
        ensurePeriod:async()=>limits,
        spendCredits:async(id,bucket,amount=1)=>{calls.push(['spend',bucket]);if(state[bucket]<amount)return {ok:false,reason:'insufficient',remaining:state[bucket]};state[bucket]-=amount;return {ok:true,remaining:state[bucket]};},
        spendMany:async(id,costs)=>{calls.push(['spend',Object.keys(costs)]);for(const [b,n] of Object.entries(costs))if(state[b]<n)return {ok:false,bucket:b,remaining:state[b]};for(const [b,n] of Object.entries(costs))state[b]-=n;return {ok:true};},
        refundCredits:async(id,bucket,reason,amount=1)=>{calls.push(['refund',bucket]);state[bucket]+=amount;},
        refundMany:async(id,costs)=>{calls.push(['refund',Object.keys(costs)]);for(const [b,n] of Object.entries(costs))state[b]+=n;},
        creditBalance:async(id,bucket='tailoring')=>state[bucket],
        outOfCreditsBody:(bucket,remaining)=>({error:'out of '+bucket,bucket,outOfCredits:true,credits_remaining:remaining}),
        notOnPlanBody:(feature,planType)=>({error:feature+' not on '+planType,upgradeRequired:true,feature,plan:planType}),
    };
    const callBackend=async(url,opts)=>{calls.push(['model',url,opts]);if(fail===true||fail.includes(url))return {ok:false,status:500,data:null,error:'model unavailable'};return {ok:true,status:200,data:REPLIES[url]};};
    const db={master_profiles:{findFirst:async()=>({parsed_data:{fullName:'Example Person'}})},savedInterview:{create:async()=>({id:'interview1'})}};
    const overrides={'next-auth':session,'@/app/api/auth/[...nextauth]/route':auth,'@/lib/credits':credits,'@/lib/career-ops':{callBackend},'@/lib/planCatalog':catalog,'@/lib/db':{db},'@/lib/linkedin-skills':{sanitizeLinkedInProfile:data=>data}};
    const spent=()=>Object.fromEntries(Object.keys(start).map(b=>[b,start[b]-state[b]]).filter(([,n])=>n!==0));
    return {calls,spent,route:file=>load('app/api/'+file+'/route.ts',overrides)};
}

const jobInput={jobDescription:'Build reliable payment services in Python and SQL.',masterProfile:{fullName:'Example Person',skills:['Python']}};
const METERED=[
    ['tailored resume','resume/generate','tailoredResume',jobInput],
    ['application pack','resume/generate-all','applicationPack',jobInput],
    ['cover letter','cover-letter/generate','coverLetter',jobInput],
    ['application email','email/generate','applicationEmail',jobInput],
    ['LinkedIn optimization','linkedin/optimize','linkedinOptimization',{analysisId:'analysis1'}],
    ['interview questions','interview/questions','interviewQuestions',{job_title:'Engineer',company:'Example',job_description:'Build reliable services.',num_questions:5}],
    ['AI ATS insights','ats/insights','atsInsights',{jdText:'Build reliable services.',resumeText:'Built reliable services.',atsScores:{overall_ats_score:72}}],
];

for(const [name,file,action,body] of METERED){
    const cost=catalog.CREDIT_COSTS[action];
    test(`${name} charges ${catalog.describeCost(cost)}, reserved before the model runs`,async()=>{
        const h=harness();const r=await h.route(file).POST(post(body));
        assert.equal(r.status,200,await r.text());
        assert.deepEqual(h.spent(),cost);
        const spend=h.calls.findIndex(c=>c[0]==='spend'),model=h.calls.findIndex(c=>c[0]==='model');
        assert.ok(spend>=0&&spend<model,'the credit must be reserved before the model is called');
    });
    test(`${name} costs nothing when the model fails`,async()=>{
        const h=harness({fail:true});const r=await h.route(file).POST(post(body));
        assert.ok(r.status>=500,`expected a 5xx, got ${r.status}`);
        assert.deepEqual(h.spent(),{});
    });
    test(`${name} is refused without calling the model when its bucket is empty`,async()=>{
        const balances={tailoring:5,writing:5,interview:5};for(const b of Object.keys(cost))balances[b]=0;
        const h=harness({balances});const r=await h.route(file).POST(post(body));
        assert.equal(r.status,403);assert.equal((await r.json()).outOfCredits,true);
        assert.equal(h.calls.filter(c=>c[0]==='model').length,0);assert.deepEqual(h.spent(),{});
    });
}

test('an application pack with no writing credits is refused, not handed out free',async()=>{
    const h=harness({balances:{tailoring:5,writing:0,interview:5}});
    const r=await h.route('resume/generate-all').POST(post(jobInput));
    assert.equal(r.status,403);assert.equal((await r.json()).bucket,'writing');
    assert.equal(h.calls.filter(c=>c[0]==='model').length,0);assert.deepEqual(h.spent(),{});
});
test('an application pack charges only for the half that arrived',async()=>{
    const writingFailed=harness({fail:['/api/generate-cover-letter','/api/generate-draft-email']});
    assert.equal((await writingFailed.route('resume/generate-all').POST(post(jobInput))).status,200);
    assert.deepEqual(writingFailed.spent(),{tailoring:1});
    const resumeFailed=harness({fail:['/api/generate-tailored-resume']});
    assert.equal((await resumeFailed.route('resume/generate-all').POST(post(jobInput))).status,200);
    assert.deepEqual(resumeFailed.spent(),{writing:1});
});
test('two resume requests racing for the last tailoring credit generate once',async()=>{
    const h=harness({balances:{tailoring:1,writing:5,interview:5}}),route=h.route('resume/generate');
    const statuses=(await Promise.all([route.POST(post(jobInput)),route.POST(post(jobInput))])).map(r=>r.status).sort();
    assert.deepEqual(statuses,[200,403]);assert.equal(h.calls.filter(c=>c[0]==='model').length,1);
});
for(const [name,file,body,options] of [
    ['LinkedIn optimization on a plan without it','linkedin/optimize',{analysisId:'analysis1'},{plan:'FREE',flags:{has_linkedin_optimization:false}}],
    ['interview prep switched off for the plan','interview/questions',{job_title:'Engineer',job_description:'Build reliable services.'},{plan:'FREE',flags:{has_interview_prep:false}}],
    ['AI ATS insights on Free','ats/insights',{jdText:'Build things.',resumeText:'Built things.',atsScores:{overall_ats_score:60}},{plan:'FREE'}],
])test(`${name} is refused before any credit moves`,async()=>{
    const h=harness(options);const r=await h.route(file).POST(post(body));
    assert.equal(r.status,403);assert.equal((await r.json()).upgradeRequired,true);
    assert.equal(h.calls.filter(c=>c[0]==='spend'||c[0]==='model').length,0);
});
test('the python proxy forwards only the free endpoints',async()=>{
    const forwarded=[],realFetch=global.fetch;
    global.fetch=async url=>{forwarded.push(String(url));return new Response('{}',{headers:{'content-type':'application/json'}});};
    try{
        const proxy=load('app/api/python/[...path]/route.ts',{'next-auth':session,'@/app/api/auth/[...nextauth]/route':auth});
        const call=segments=>proxy.POST(new Request('https://app.vignova.io/api/python/x',{method:'POST',body:'{}'}),{params:Promise.resolve({path:segments})});
        assert.equal((await call(['calculate-ats'])).status,200);
        for(const blocked of [['generate-tailored-resume'],['generate-cover-letter'],['generate-draft-email'],['enhance-ats-report'],['interview','questions'],['saved-jds','..','generate-tailored-resume'],['admin','users']])
            assert.equal((await call(blocked)).status,404,blocked.join('/'));
        assert.equal(forwarded.length,1);
    }finally{global.fetch=realFetch;}
});
test('no endpoint hands credits back on request',()=>{
    for(const route of ['credits/refund','credits/deduct'])assert.equal(fs.existsSync(path.join(app,'app/api',route,'route.ts')),false,route);
});
test('dashboard and extension packs are priced from the same catalog entry',()=>{
    for(const file of ['app/api/resume/generate-all/route.ts','app/api/extension/generate-all/route.ts'])
        assert.match(fs.readFileSync(path.join(app,file),'utf8'),/CREDIT_COSTS\.applicationPack/,file);
});
test('pricing cards read allowances from the numeric plan columns',()=>{
    const [free,pro,premium]=catalog.DEFAULT_PLANS;
    const rows=plan=>Object.fromEntries(catalog.planAllowances(plan).map(r=>[r.key,r.text]));
    assert.deepEqual(rows(free),{tailoring:'3 tailoring credits / month',writing:'3 writing credits / month',interview:'1 interview credit / month',profiles:'1 master profile'});
    assert.deepEqual(rows(pro),{tailoring:'50 tailoring credits / month',writing:'100 writing credits / month',interview:'5 interview credits / month',profiles:'5 master profiles'});
    assert.deepEqual(rows(premium),{tailoring:'Unlimited tailoring credits',writing:'Unlimited writing credits',interview:'Unlimited interview credits',profiles:'Unlimited master profiles'});
    assert.equal(catalog.planAllowances({...free,has_interview_prep:false}).find(r=>r.key==='interview').included,false);
    assert.equal(catalog.planFeatures(free).find(f=>f.label==='AI ATS insights').included,false);
    assert.equal(catalog.describeCost(catalog.CREDIT_COSTS.applicationPack),'1 tailoring + 1 writing credit');
    assert.equal(catalog.DEFAULT_PLANS.filter(p=>p.is_popular).length,1);
});
test('the credit bucket migration is safe to run on every container start',()=>{
    // Comments are dropped first: they explain what the statements used to do.
    const sql=fs.readFileSync(path.join(app,'prisma/migrations/20260913_credit_buckets.sql'),'utf8').split(/\r?\n/).filter(line=>!line.trim().startsWith('--')).join('\n');
    assert.doesNotMatch(sql,/DO UPDATE/i,'re-running must not reset balances');
    assert.doesNotMatch(sql,/WHERE plan_type = '(FREE|PRO|PREMIUM)';/,'plan numbers must not be overwritten unconditionally');
});
test('extension interview prep honours the plan switch',async()=>{
    const cors=load('lib/extensionCors.ts');
    const planLimits=load('lib/planLimits.ts',{'./db':{db:{plan_configs:{findUnique:async()=>null}}},'./planCatalog':catalog});
    const gate=has_interview_prep=>load('lib/extensionPlan.ts',{'@/lib/extensionCors':cors,'@/lib/planLimits':planLimits,'@/lib/credits':{ensurePeriod:async()=>({plan_type:'FREE',tailoring:3,writing:3,interview:1,max_profiles:1,has_extension_access:true,has_multi_profile:false,has_unlimited_resumes:false,has_linkedin_optimization:false,has_interview_prep})},'@/lib/db':{db:{credit_buckets:{findFirst:async()=>({remaining:1})}}}});
    assert.equal((await gate(false).checkAiAccess({user_id:USER,plan_type:'FREE'},'Interview Prep','interview',USER))?.status,402);
    assert.equal(await gate(true).checkAiAccess({user_id:USER,plan_type:'FREE'},'Interview Prep','interview',USER),null);
});
test('creating a master profile stops at the plan max_profiles',async()=>{
    const created=[];
    const route=load('app/api/profiles/route.ts',{'next-auth':session,'@/app/api/auth/[...nextauth]/route':auth,
        '@/lib/db':{db:{master_profiles:{count:async()=>5,findFirst:async()=>null,create:async args=>{created.push(args);return {id:'profile6'};}}}},
        '@/lib/subscription':{getUserSubscription:async()=>({plan_type:'PRO'})},
        '@/lib/planLimits':{UNLIMITED:-1,enforcedPlanLimits:async()=>({plan_type:'PRO',max_profiles:5})},
        '@/lib/profileSkills':load('lib/profileSkills.ts')});
    const r=await route.POST(post({name:'Sixth profile',parsed_data:{}}));
    assert.equal(r.status,403);assert.match((await r.json()).message,/5 master profiles/);assert.equal(created.length,0);
});
