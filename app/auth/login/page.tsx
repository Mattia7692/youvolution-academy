import { LoginForm } from "@/components/login-form";

export default function Page() {
  return (
    <div
      className="flex min-h-svh w-full items-center justify-center p-6 md:p-10"
      style={{
        background:
          "linear-gradient(160deg, hsl(190 30% 10%) 0%, hsl(190 28% 14%) 45%, hsl(173 35% 16%) 100%)",
      }}
    >
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}
