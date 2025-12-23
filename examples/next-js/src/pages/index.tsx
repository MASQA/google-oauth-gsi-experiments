import LoginButtons from "../components/login-buttons";
import AuthStatus from "../components/auth-status";

export default function Home() {
  return (
    <main>
      <AuthStatus />
      <LoginButtons />
    </main>
  );
}
