// components/Header.tsx
"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

interface HeaderProps {
    userName?: string;
    userEmail?: string;
    userImage?: string;
    type: number;
}

export default function Header({
                                   userName = "User",
                                   userEmail,
                                   userImage,
                                    type,
                               }: HeaderProps) {
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await api.logout();
            router.push('/login');
        } catch (error) {
            console.error('Logout failed:', error);
            // Still clear local token and redirect
            api.clearToken();
            router.push('/login');
        }
    };

    if(type == 0 )return (
        <header className="w-full bg-red-900 flex items-center px-6 py-4 h-32 z-50">
            <div className="flex items-center space-x-3">
                <img
                    src="/logo.svg"
                    alt="Logo"
                    className="w-32 h-32 rounded object-contain"
                />
                <div>
                    <p className="text-white font-bold text-lg">NOIR</p>
                </div>
            </div>
            <div className="bg-black px-4 h-16 flex items-center  flex-grow-0 m-3 w-xl rounded">
                <h1 className="text-white text-xl font-medium">Olá, {userName}!</h1>
            </div>
            <div className="flex items-center space-x-2 flex-1 justify-end-safe m-3">
            <div className="flex items-center space-x-3 align-end">
                {userImage ? (
                    <img
                        src={userImage}
                        alt={userName}
                        className="w-10 h-10 rounded-full object-cover"
                    />
                ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-700">
                        {userName[0]}
                    </div>
                )}
                <p className="text-white">{userEmail}</p>
                <Button
                    onClick={handleLogout}
                    variant="outline"
                    className="bg-white text-red-900 hover:bg-gray-100"
                >
                    Logout
                </Button>
            </div>
            </div>
        </header>
    );
}
