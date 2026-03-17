"use client";

import React from 'react';
import Link from 'next/link';
import { Twitter, Linkedin, Github, Mail } from 'lucide-react';

export const Footer = () => {
    return (
        <footer className="bg-black border-t border-white/10 py-12">
            <div className="max-w-7xl mx-auto px-4">
                <div className="grid md:grid-cols-4 gap-8 mb-8">
                    <div className="col-span-1 md:col-span-2">
                        <h3 className="text-xl font-bold text-white mb-4">Vignova</h3>
                        <p className="text-gray-400 max-w-sm">
                            Building the future of career advancement with AI-powered tools.
                            Create, optimize, and land your dream job.
                        </p>
                    </div>

                    <div>
                        <h4 className="text-white font-semibold mb-4">Product</h4>
                        <ul className="space-y-2">
                            <li><Link href="#" className="text-gray-400 hover:text-green-500">Features</Link></li>
                            <li><Link href="#" className="text-gray-400 hover:text-green-500">Templates</Link></li>
                            <li><Link href="#" className="text-gray-400 hover:text-green-500">Pricing</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-semibold mb-4">Company</h4>
                        <ul className="space-y-2">
                            <li><Link href="#" className="text-gray-400 hover:text-green-500">About</Link></li>
                            <li><Link href="#" className="text-gray-400 hover:text-green-500">Blog</Link></li>
                            <li><Link href="#" className="text-gray-400 hover:text-green-500">Contact</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center bg-black">
                    <p className="text-gray-500 text-sm">
                        Â© {new Date().getFullYear()} Vignova. All rights reserved.
                    </p>
                    <div className="flex gap-4 mt-4 md:mt-0">
                        <Link href="#" className="text-gray-400 hover:text-white"><Twitter className="w-5 h-5" /></Link>
                        <Link href="#" className="text-gray-400 hover:text-white"><Linkedin className="w-5 h-5" /></Link>
                        <Link href="#" className="text-gray-400 hover:text-white"><Github className="w-5 h-5" /></Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};
