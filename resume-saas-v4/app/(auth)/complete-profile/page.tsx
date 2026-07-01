import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { CompleteProfileForm } from "@/components/auth/CompleteProfileForm";

export const dynamic = 'force-dynamic';

export default async function CompleteProfilePage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    redirect("/login");
  }

  // Check if they already have a country
  const user = await db.users.findUnique({
    where: { email: session.user.email }
  });

  if (user?.country) {
    redirect("/dashboard");
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-black font-ui selection:bg-white/20">
      <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#059669_0%,#000000_60%)] opacity-80" />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
      </div>
      <div className="relative z-10 w-full max-w-[500px] rounded-[24px] bg-black/20 p-6 sm:p-8 backdrop-blur-[32px] border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] my-auto flex flex-col">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-2 text-center">
              Complete your profile
          </h2>
          <p className="text-sm text-gray-400 mb-6 text-center">
              Please tell us where you are located to continue.
          </p>
          <CompleteProfileForm />
      </div>
    </div>
  );
}
