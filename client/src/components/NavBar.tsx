import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function NavBar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    async function handleLogout() {
        await logout();
        navigate("/login");
    }

    return (
        <nav className="bg-white border-b-4 border-black px-4 md:px-6 py-3 sticky top-0 z-30">
            <div className="max-w-[1600px] mx-auto flex items-center justify-between">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-1.5">
                    <div className="bg-black px-2 py-1 rotate-[-2deg]">
                        <span className="font-grotesk font-black text-white text-sm uppercase tracking-widest">
                            MEET
                        </span>
                    </div>
                    <span className="font-grotesk font-black text-xl tracking-tight">
                        ROOM
                    </span>
                    <span
                        className="text-[#FFBE0B] text-3xl animate-spin"
                        style={{ animationDuration: "5s" }}
                    >
                        ✦
                    </span>
                </Link>

                {/* Nav links */}
                <div className="hidden md:flex items-center gap-6">
                    <NavLink
                        to="/"
                        className={({ isActive }) =>
                            `font-mono text-xs font-bold uppercase pb-0.5 transition-all ${isActive ? "border-b-4 border-black" : "border-b-2 border-transparent hover:border-black"}`
                        }
                    >
                        日历
                    </NavLink>
                    <NavLink
                        to="/my-bookings"
                        className={({ isActive }) =>
                            `font-mono text-xs font-bold uppercase pb-0.5 transition-all ${isActive ? "border-b-4 border-black" : "border-b-2 border-transparent hover:border-black"}`
                        }
                    >
                        我的预订
                    </NavLink>
                    {user?.role === "ADMIN" && (
                        <NavLink
                            to="/admin/users"
                            className={({ isActive }) =>
                                `font-mono text-xs font-bold uppercase pb-0.5 transition-all ${isActive ? "border-b-4 border-black" : "border-b-2 border-transparent hover:border-black"}`
                            }
                        >
                            管理后台
                        </NavLink>
                    )}
                </div>

                {/* User + logout */}
                <div className="flex items-center gap-2">
                    <span className="hidden md:inline font-mono text-xs text-gray-500">
                        {user?.name}
                    </span>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-1.5 rounded-none border-4 border-black bg-[#FF006E] text-white px-3 py-1.5 font-grotesk font-black text-xs uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
                    >
                        退出登录
                    </button>
                </div>
            </div>
        </nav>
    );
}
