"use client";

import { useState } from "react";
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";

export function LoginForm({
                              className,
                              ...props
                          }: React.ComponentProps<"form">) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            await api.login({ email, password });
            router.push("/dashboard/funnels");
        } catch (err: any) {
            setError(err.message || "Login failed");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form className={cn("flex flex-col gap-6", className)} onSubmit={handleSubmit} {...props}>
            <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Entre na sua conta</h1>
                <p className="text-muted-foreground text-sm text-balance">
                    Digite seu e-mail abaixo para entrar na sua conta
                </p>
            </div>
            {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm text-center bg-red-50 p-2 rounded">
                    <AlertTriangle className="w-4 h-4" />
                    <span>{error}</span>
                </div>
            )}
            <div className="grid gap-6">
                <div className="grid gap-3">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="m@exemplo.com"
                        required
                        className="bg-white"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>
                <div className="grid gap-3">
                    <div className="flex items-center">
                        <Label htmlFor="password">Senha</Label>
                        <a
                            href="#"
                            className="ml-auto text-sm underline-offset-4 hover:underline"
                        >
                            Esqueceu sua senha?
                        </a>
                    </div>
                    <Input
                        id="password"
                        type="password"
                        required
                        className="bg-white"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Logging in..." : "Login"}
                </Button>
                <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
          <span className="bg-background text-muted-foreground relative z-10 px-2">
            Or continue with
          </span>
                </div>
                <Button variant="outline" className="w-full">
                    <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="100" height="100" viewBox="0 0 50 50">
                        <path d="M 26 2 C 13.259016 2 3 12.360055 3 25 C 3 37.645455 13.354545 48 26 48 C 35.900347 48 41.951796 43.426386 45.099609 37.773438 C 48.247423 32.120489 48.63188 25.497876 47.677734 20.992188 L 47.511719 20.203125 L 25 20.095703 L 25 21.099609 L 25 30.5 L 36.431641 30.5 C 34.686862 34.491527 31.232881 37.199219 26 37.199219 C 19.238813 37.199219 13.699219 31.75985 13.699219 24.900391 C 13.699219 18.040931 19.22968 12.699219 26 12.699219 C 29.057576 12.699219 31.818811 13.806864 33.943359 15.654297 L 34.648438 16.265625 L 42.253906 8.6601562 L 41.46875 7.9550781 C 37.394931 4.2990866 31.95731 2 26 2 z M 26 4 C 31.058339 4 35.659339 5.8640551 39.28125 8.8046875 L 34.433594 13.652344 C 32.068847 11.863757 29.197935 10.699219 26 10.699219 C 18.17032 10.699219 11.699219 16.95985 11.699219 24.900391 C 11.699219 32.840931 18.161187 39.199219 26 39.199219 C 32.587097 39.199219 37.245694 35.247491 38.955078 29.798828 L 39.361328 28.5 L 27 28.5 L 27 22.103516 L 45.8125 22.195312 C 46.471442 26.196376 46.036865 31.978427 43.351562 36.800781 C 40.499376 41.922829 35.299653 46 26 46 C 14.445455 46 5 36.554545 5 25 C 5 13.439945 14.340984 4 26 4 z"></path>
                    </svg>
                    Login with Google
                </Button>
            </div>
            <div className="text-center text-sm">
                Don&apos;t have an account?{" "}
                <a href="/signup" className="underline underline-offset-4">
                    Sign up
                </a>
            </div>
        </form>
    )
}
