"use client"

import { useState } from "react";
import Link from "next/link";
import { CalendarSearch, Funnel, LayoutDashboard, MessageCircleMore, Settings } from "lucide-react";
import { useUser } from "@/hooks/useUser";

export default function Sidebar() {
    const [isHovered, setIsHovered] = useState(false);
    const { user } = useUser();

    return (
        <div
            className={`bg-black text-white transition-all duration-300 flex flex-col
      ${isHovered ? "w-56" : "w-16"}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <ul className="flex flex-col gap-2 mt-4">
                <li>
                    <Link href="/dashboard/funnels" className="flex items-center gap-3 p-3 hover:bg-gray-700 rounded-xl cursor-pointer">
                        <Funnel size={22} />
                        {isHovered && <span>Funil</span>}
                    </Link>
                </li>
                <li>
                    <Link href="/dashboard" className="flex items-center gap-3 p-3 hover:bg-gray-700 rounded-xl cursor-pointer">
                        <LayoutDashboard size={22} />
                        {isHovered && <span>Dashboard</span>}
                    </Link>
                </li>
            </ul>
            <div className="mt-auto mb-4">
                {(user?.role === 'ADMIN' || user?.role === 'USER') && (
                    <Link href="/dashboard/settings" className="flex items-center gap-3 p-3 hover:bg-gray-700 rounded-xl cursor-pointer">
                        <Settings size={22} />
                        {isHovered && <span>Configurações</span>}
                    </Link>
                )}
            </div>
        </div>
    );
}
