"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Mail } from 'lucide-react';

const footerLinks = {
    product: [
        { label: "Product", href: "/product" },
        { label: "How It Works", href: "/how-it-works" },
        { label: "Extension", href: "/extension" },
    ],
    company: [
        { label: "About Us", href: "/about" },
        { label: "Contact", href: "/contact" },
    ],
    legal: [
        { label: "Privacy Policy", href: "/privacy" },
        { label: "Terms", href: "/terms" },
    ],
};

export const Footer = () => {
    return (
        <footer className="bg-[#0f172a] border-t border-white/10 py-12">
            <div className="max-w-[1200px] mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-8">
                    <div className="col-span-1 md:col-span-2">
                        <div className="flex items-end mb-4 flex-wrap">
                            <Image src="/logo.png" alt="Vignova Logo" width={64} height={64} className="w-16 h-16 object-contain" />
                            <h3 className="text-3xl font-bold text-white mb-1 -ml-3 md:-ml-3 z-10 tracking-tight">VIGNOVA</h3>
                        </div>
                        <p className="text-gray-400 max-w-sm mb-4">
                            AI-powered career platform. Create tailored resumes, optimize for ATS systems, and apply to jobs faster.
                        </p>
                        <Link
                            href="mailto:hello@vignova.io"
                            className="inline-flex items-center gap-2 text-gray-400 hover:text-blue-400 text-sm transition-colors"
                        >
                            <Mail className="w-4 h-4" />
                            hello@vignova.io
                        </Link>
                    </div>

                    <div>
                        <h4 className="text-white font-semibold mb-4">Product</h4>
                        <ul className="space-y-2">
                            {footerLinks.product.map((link, i) => (
                                <li key={i}>
                                    <Link href={link.href} className="text-gray-400 hover:text-blue-400 text-sm transition-colors">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-semibold mb-4">Company</h4>
                        <ul className="space-y-2">
                            {footerLinks.company.map((link, i) => (
                                <li key={i}>
                                    <Link href={link.href} className="text-gray-400 hover:text-blue-400 text-sm transition-colors">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-semibold mb-4">Legal</h4>
                        <ul className="space-y-2">
                            {footerLinks.legal.map((link, i) => (
                                <li key={i}>
                                    <Link href={link.href} className="text-gray-400 hover:text-blue-400 text-sm transition-colors">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center">
                    <p className="text-gray-500 text-sm">
                        © {new Date().getFullYear()} Vignova. All rights reserved.
                    </p>
                    <p className="text-gray-600 text-xs mt-2 md:mt-0">
                        Built with AI. Designed for job seekers.
                    </p>
                </div>
            </div>
        </footer>
    );
};
