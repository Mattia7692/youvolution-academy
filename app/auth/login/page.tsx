import { LoginForm } from "@/components/login-form";

export default function Page() {
  return (
    <div
      className="flex min-h-svh w-full items-center justify-center p-6 md:p-10"
      style={{
        background:
          "linear-gradient(180deg, #0f1a3d 0%, #1a2150 38%, #2b1b3d 70%, #3a1a22 100%)",
      }}
    >
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}
