"use client";

import Header from "@/components/header";
import Sidebar from "@/components/Sidebar"
import { ReactNode } from "react";
import { useUser } from "@/hooks/useUser";

interface LayoutProps {
    children: ReactNode;
}

export default function Layout({ children } : LayoutProps) {
    const { user, loading } = useUser();

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="flex flex-col h-screen">
            <Header
                type={0}
                userName={user?.name || user?.email || "User"}
                userEmail={user?.email || ""}
                userImage={undefined} // Add image if available
            />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                <main className="flex-1 overflow-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
