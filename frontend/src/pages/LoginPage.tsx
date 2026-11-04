import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_BASE } from "../api/config";
import { apiErrorMessage } from "../api/errors";
import { Eye, EyeOff, Activity, Lock, Mail, User, CheckCircle, AlertCircle, X, Shield, Check, Info, KeyRound, Sparkles, HelpCircle } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import { useTranslation } from "react-i18next";

type Mode = "signin" | "signup";
type ToastType = "info" | "success" | "error";

export default function LoginPage() {
    const { t } = useTranslation();
    const { login, loginWithGoogle } = useAuth();
    const navigate = useNavigate();
    const emailRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    const [mode, setMode] = useState<Mode>("signin");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [accountType, setAccountType] = useState<"user" | "admin">("user");
    const [adminSignupCode, setAdminSignupCode] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [showConfirmPass, setShowConfirmPass] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingStep, setLoadingStep] = useState("");
    const [isShaking, setIsShaking] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);
    const [rememberMe, setRememberMe] = useState<boolean>(() => localStorage.getItem("si_remember_me") === "true");
    const [capsLockOn, setCapsLockOn] = useState(false);
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [forgotEmail, setForgotEmail] = useState("");
    const [forgotSubmitted, setForgotSubmitted] = useState(false);
    const [legalModal, setLegalModal] = useState<"terms" | "privacy" | null>(null);

    // Live validation
    const [emailTouched, setEmailTouched] = useState(false);
    const [confirmTouched, setConfirmTouched] = useState(false);

    const emailValid = validateEmail(email);
    const passwordsMatch = password === confirmPassword;

    // Load saved email if Remember Me was previously active
    useEffect(() => {
        const saved = localStorage.getItem("si_saved_email");
        if (saved) {
            setEmail(saved);
            setEmailTouched(true);
        }
    }, []);

    useEffect(() => {
        document.documentElement.classList.remove("light-theme");
        document.documentElement.classList.add("dark-theme");
        document.title = "Smart-Infra AI";
        let meta = document.querySelector('meta[name="description"]');
        if (!meta) {
            meta = document.createElement("meta");
            meta.setAttribute("name", "description");
            document.head.appendChild(meta);
        }
        meta.setAttribute("content", `Access the Smart-Infra AI platform. ${mode === "signin" ? "Login to your account." : "Create a new secure account."}`);
        if (emailRef.current) emailRef.current.focus();
    }, [mode]);

    // Video autoplay assurance with fallback for browser policies
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        video.muted = true;
        video.defaultMuted = true;

        const playPromise = video.play();
        if (playPromise !== undefined) {
            playPromise.catch((err) => {
                console.warn("Login page video autoplay was deferred by browser policy:", err);
            });
        }

        const handleFirstInteraction = () => {
            if (video && video.paused) {
                video.play().catch(() => { });
            }
        };

        window.addEventListener("click", handleFirstInteraction, { once: true });
        window.addEventListener("touchstart", handleFirstInteraction, { once: true });
        window.addEventListener("keydown", handleFirstInteraction, { once: true });

        return () => {
            window.removeEventListener("click", handleFirstInteraction);
            window.removeEventListener("touchstart", handleFirstInteraction);
            window.removeEventListener("keydown", handleFirstInteraction);
        };
    }, []);

    function validateEmail(e: string) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
    }

    const showToast = (msg: string, type: ToastType = "info") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    const triggerShake = () => {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
    };

    const switchMode = (next: Mode) => {
        setMode(next);
        setError(null);
        setEmailTouched(false);
        setConfirmTouched(false);
        setCapsLockOn(false);
        setName(""); setPassword(""); setConfirmPassword("");
        const saved = localStorage.getItem("si_saved_email");
        if (saved && rememberMe) {
            setEmail(saved);
        } else {
            setEmail("");
        }
        setAdminSignupCode(""); setAccountType("user");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        if (mode === "signup") {
            if (!name.trim()) { setError("Please enter your full name to continue."); triggerShake(); setLoading(false); return; }
            if (!validateEmail(email)) { setError("That email address doesn't look right. Please double-check it."); triggerShake(); setLoading(false); return; }
            if (password.length < 8) { setError("Your password must be at least 8 characters long."); triggerShake(); setLoading(false); return; }
            if (password !== confirmPassword) { setError("Passwords don't match. Please re-enter them."); triggerShake(); setLoading(false); return; }
            if (accountType === "admin" && !adminSignupCode.trim()) {
                setError("An admin signup code is required for admin accounts.");
                triggerShake();
                setLoading(false);
                return;
            }

            setLoadingStep("Creating your account…");
            try {
                const res = await fetch(`${API_BASE}/auth/register`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name,
                        email,
                        password,
                        account_type: accountType,
                        admin_signup_code: accountType === "admin" ? adminSignupCode : undefined,
                    }),
                });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(apiErrorMessage(err, "Registration failed"));
                }
                showToast("Account created! Signing you in…", "success");
            } catch (err: any) {
                setError(err.message || "Something went wrong. Please try again.");
                triggerShake();
                setLoading(false);
                setLoadingStep("");
                return;
            }
        }

        setLoadingStep(mode === "signup" ? "Signing you in…" : "Verifying credentials…");
        try {
            if (rememberMe) {
                localStorage.setItem("si_saved_email", email);
                localStorage.setItem("si_remember_me", "true");
            } else {
                localStorage.removeItem("si_saved_email");
                localStorage.setItem("si_remember_me", "false");
            }
            await login(email, password);
            navigate("/dashboard", { replace: true });
        } catch (err: any) {
            setError(err.message || "Incorrect email or password. Please try again.");
            triggerShake();
        } finally {
            setLoading(false);
            setLoadingStep("");
        }
    };

    const handleGoogleSuccess = async (credentialResponse: any) => {
        if (!credentialResponse.credential) return;
        setLoading(true);
        setLoadingStep("Verifying with Google…");
        setError(null);
        showToast("Establishing encrypted connection…", "info");
        try {
            await loginWithGoogle(credentialResponse.credential);
            navigate("/dashboard", { replace: true });
        } catch (err: any) {
            setError(err.message || "Google sign-in failed. Please try again or use email.");
            triggerShake();
        } finally {
            setLoading(false);
            setLoadingStep("");
        }
    };

    const getStrength = (p: string) => {
        if (!p) return 0;
        let s = 0;
        if (p.length >= 8) s += 1;
        if (/[A-Z]/.test(p)) s += 1;
        if (/[0-9]/.test(p)) s += 1;
        if (/[^A-Za-z0-9]/.test(p)) s += 1;
        return s;
    };
    const strength = getStrength(password);
    const strengthLabel = strength < 2 ? "Weak" : strength < 4 ? "Fair" : "Strong";
    const strengthColor = strength < 2 ? "#ef4444" : strength < 4 ? "#f59e0b" : "#10b981";

    return (
        <div className="lp-root">
            {/* ── Background Video with Blurry Effect (Login Page Only) ── */}
            <div className="lp-video-backdrop" aria-hidden="true">
                <video
                    ref={videoRef}
                    className="lp-bg-video"
                    src="/Smart_city_camera_loginpage.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                />
                <div className="lp-video-overlay" />
            </div>

            {/* ── Toast ── */}
            {toast && (
                <div className={`lp-toast lp-toast-${toast.type}`}>
                    {toast.type === "success" ? <CheckCircle size={15} /> : toast.type === "error" ? <AlertCircle size={15} /> : <Activity size={15} className="lp-toast-icon" />}
                    <span>{toast.msg}</span>
                    <button className="lp-toast-close" onClick={() => setToast(null)}><X size={13} /></button>
                </div>
            )}

            {/* ── Brand Panel ── */}
            <div className="lp-brand">
                <div className="lp-brand-inner">
                    <div className="lp-logo-wrap">
                        <div className="lp-logo-ring" />
                        <div className="lp-logo">
                            <img src="/smart-infra-icon.png" alt="Smart-Infra AI Logo" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
                        </div>
                    </div>
                    <h1 className="lp-product">
                        <span className="lp-product-main">Smart-Infra</span> <span className="lp-product-ai">AI</span>
                    </h1>
                    <p className="lp-tagline">{t("auth.brand.tagline")}</p>
                </div>
            </div>

            {/* ── Auth Panel ── */}
            <div className="lp-auth">
                <div className={`lp-card ${isShaking ? "lp-shake" : ""}`}>

                    {/* Tab toggle */}
                    <div className="lp-toggle">
                        <button type="button" className={mode === "signin" ? "active" : ""} onClick={() => switchMode("signin")}>
                            {t("auth.tabs.signIn")}
                        </button>
                        <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => switchMode("signup")}>
                            {t("auth.tabs.signUp")}
                        </button>
                    </div>

                    <h2 className="lp-card-title">
                        {mode === "signin" ? t("auth.login.title") : t("auth.register.title")}
                    </h2>
                    <p className="lp-card-sub">
                        {mode === "signin" ? t("auth.login.subtitle") : t("auth.register.subtitle")}
                    </p>

                    <form onSubmit={handleSubmit} className="lp-form" noValidate>

                        {/* ── Signup-only fields ── */}
                        <div className={`lp-signup-fields ${mode === "signup" ? "active" : ""}`}>
                            {/* Account type */}
                            <div className="lp-field">
                                <label>{t("auth.fields.accountType")}</label>
                                <div className="lp-role-toggle">
                                    <button type="button" className={accountType === "user" ? "active" : ""} onClick={() => setAccountType("user")}>
                                        {t("auth.fields.roleUser")}
                                    </button>
                                    <button type="button" className={accountType === "admin" ? "active" : ""} onClick={() => setAccountType("admin")}>
                                        {t("auth.fields.roleAdmin")}
                                    </button>
                                </div>
                            </div>

                            {/* Full name */}
                            <div className="lp-field">
                                <label>{t("auth.fields.fullName")}</label>
                                <div className="lp-input-wrap">
                                    <User size={15} className="lp-input-icon" />
                                    <input
                                        id="name" name="name" type="text"
                                        placeholder="e.g. John Smith"
                                        value={name} onChange={e => setName(e.target.value)}
                                        autoComplete="name"
                                    />
                                </div>
                            </div>

                            {/* Admin code */}
                            {accountType === "admin" && (
                                <div className="lp-field">
                                    <div className="lp-field-header-row">
                                        <label>{t("auth.fields.adminSignupCode")}</label>
                                        <button
                                            type="button"
                                            className="lp-helper-badge-btn"
                                            onClick={() => {
                                                setAdminSignupCode("AI-SMART-INFRA-2026");
                                                showToast("Filled deployment admin code", "info");
                                            }}
                                            title="Fill deployment admin passphrase"
                                        >
                                            <Sparkles size={11} />
                                            <span>Default Key</span>
                                        </button>
                                    </div>
                                    <div className="lp-input-wrap">
                                        <Shield size={15} className="lp-input-icon" />
                                        <input
                                            id="adminSignupCode" name="adminSignupCode"
                                            type="password"
                                            placeholder="Enter your admin code"
                                            value={adminSignupCode}
                                            onChange={e => setAdminSignupCode(e.target.value)}
                                            autoComplete="off"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── Email ── */}
                        <div className="lp-field">
                            <label>{t("auth.fields.email")}</label>
                            <div className={`lp-input-wrap ${emailTouched && email && !emailValid ? "lp-input-invalid" : emailTouched && emailValid ? "lp-input-valid" : ""}`}>
                                <Mail size={15} className="lp-input-icon" />
                                <input
                                    id="email" name="email"
                                    ref={emailRef}
                                    type="email"
                                    placeholder="[EMAIL_ADDRESS]"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    onBlur={() => setEmailTouched(true)}
                                    required autoComplete="email"
                                />
                                {emailTouched && email && (
                                    emailValid
                                        ? <CheckCircle size={14} className="lp-input-status valid" />
                                        : <AlertCircle size={14} className="lp-input-status invalid" />
                                )}
                            </div>
                            {emailTouched && email && !emailValid && (
                                <span className="lp-field-hint error">Please enter a valid email address.</span>
                            )}
                        </div>

                        {/* ── Password ── */}
                        <div className="lp-field">
                            <label>{t("auth.fields.password")}</label>
                            <div className="lp-input-wrap">
                                <Lock size={15} className="lp-input-icon" />
                                <input
                                    id="password" name="password"
                                    type={showPass ? "text" : "password"}
                                    placeholder={mode === "signup" ? "Min. 8 characters" : "Enter your password"}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    onKeyUp={e => setCapsLockOn(e.getModifierState("CapsLock"))}
                                    onKeyDown={e => setCapsLockOn(e.getModifierState("CapsLock"))}
                                    required autoComplete={mode === "signup" ? "new-password" : "current-password"}
                                />
                                <button type="button" className="lp-eye" onClick={() => setShowPass(p => !p)} aria-label={t("auth.actions.togglePassword")}>
                                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>

                            {capsLockOn && (
                                <div className="lp-caps-badge">
                                    <AlertCircle size={12} />
                                    <span>Caps Lock is ON</span>
                                </div>
                            )}

                            {mode === "signup" && password.length > 0 && (
                                <div className="lp-strength">
                                    <div className="lp-strength-bars">
                                        {[1, 2, 3, 4].map(s => (
                                            <div key={s} className={`lp-strength-bar ${strength >= s ? "active" : ""}`}
                                                style={strength >= s ? { background: strengthColor } : {}} />
                                        ))}
                                    </div>
                                    <span className="lp-strength-text" style={{ color: strengthColor }}>{strengthLabel}</span>
                                    <div className="lp-pw-checklist">
                                        <span className={`lp-pw-req ${password.length >= 8 ? "met" : ""}`}>
                                            {password.length >= 8 ? <Check size={11} /> : <span className="lp-req-dot" />}
                                            8+ chars
                                        </span>
                                        <span className={`lp-pw-req ${/[A-Z]/.test(password) ? "met" : ""}`}>
                                            {/[A-Z]/.test(password) ? <Check size={11} /> : <span className="lp-req-dot" />}
                                            1 uppercase
                                        </span>
                                        <span className={`lp-pw-req ${/[0-9]/.test(password) ? "met" : ""}`}>
                                            {/[0-9]/.test(password) ? <Check size={11} /> : <span className="lp-req-dot" />}
                                            1 number
                                        </span>
                                        {confirmPassword.length > 0 && (
                                            <span className={`lp-pw-req ${passwordsMatch ? "met" : ""}`}>
                                                {passwordsMatch ? <Check size={11} /> : <span className="lp-req-dot" />}
                                                Match
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── Confirm password ── */}
                        <div className={`lp-signup-fields ${mode === "signup" ? "active" : ""}`}>
                            <div className="lp-field">
                                <label>{t("auth.fields.confirmPassword")}</label>
                                <div className={`lp-input-wrap ${confirmTouched && confirmPassword && !passwordsMatch ? "lp-input-invalid" : confirmTouched && passwordsMatch && confirmPassword ? "lp-input-valid" : ""}`}>
                                    <Lock size={15} className="lp-input-icon" />
                                    <input
                                        id="confirmPassword" name="confirmPassword"
                                        type={showConfirmPass ? "text" : "password"}
                                        placeholder="Re-enter your password"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        onKeyUp={e => setCapsLockOn(e.getModifierState("CapsLock"))}
                                        onKeyDown={e => setCapsLockOn(e.getModifierState("CapsLock"))}
                                        onBlur={() => setConfirmTouched(true)}
                                        required={mode === "signup"} autoComplete="new-password"
                                    />
                                    <button type="button" className="lp-eye" onClick={() => setShowConfirmPass(p => !p)} aria-label={t("auth.actions.toggleConfirmPassword")}>
                                        {showConfirmPass ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                </div>
                                {confirmTouched && confirmPassword && !passwordsMatch && (
                                    <span className="lp-field-hint error">Passwords don't match.</span>
                                )}
                            </div>
                        </div>

                        {/* ── Remember / Forgot ── */}
                        <div className="lp-extras">
                            <label className="lp-remember">
                                <input
                                    id="remember"
                                    name="remember"
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={e => setRememberMe(e.target.checked)}
                                />
                                <span>{t("auth.actions.rememberMe")}</span>
                            </label>
                            <button
                                type="button"
                                className="lp-forgot"
                                onClick={() => {
                                    setForgotEmail(email);
                                    setForgotSubmitted(false);
                                    setShowForgotModal(true);
                                }}
                            >
                                {t("auth.actions.forgotPassword")}
                            </button>
                        </div>

                        {/* ── Error banner ── */}
                        {error && (
                            <div className="lp-error" role="alert">
                                <AlertCircle size={15} className="lp-error-icon" />
                                <span>{error}</span>
                                <button type="button" className="lp-error-dismiss" onClick={() => setError(null)} aria-label="Dismiss"><X size={13} /></button>
                            </div>
                        )}

                        {/* ── Submit ── */}
                        <button type="submit" className="lp-submit" disabled={loading}>
                            {loading ? (
                                <>
                                    <div className="lp-spinner" />
                                    <span>{loadingStep || (mode === "signin" ? t("auth.login.loading") : t("auth.register.loading"))}</span>
                                </>
                            ) : (
                                <span>{mode === "signin" ? t("auth.login.button") : t("auth.register.button")}</span>
                            )}
                        </button>
                    </form>

                    {/* ── Social ── */}
                    <div className="lp-social">
                        <div className="lp-social-div"><span>{t("auth.actions.orSecureAccessVia")}</span></div>
                        <div className="lp-social-btns">
                            <div className="lp-google-wrapper">
                                <GoogleLogin
                                    onSuccess={handleGoogleSuccess}
                                    onError={() => {
                                        setError(t("auth.errors.googleSignInFailed", "Google Sign-In failed. Please try again."));
                                        triggerShake();
                                    }}
                                    theme="filled_black"
                                    shape="pill"
                                    size="large"
                                    text="continue_with"
                                    width="380"
                                />
                            </div>
                        </div>
                    </div>

                    <p className="lp-switch">
                        {mode === "signin" ? t("auth.login.noAccount") : t("auth.register.hasAccount")}
                        <button type="button" onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}>
                            {mode === "signin" ? t("auth.login.switchAction") : t("auth.register.switchAction")}
                        </button>
                    </p>

                    <div className="lp-legal">
                        <button type="button" onClick={() => setLegalModal("terms")}>{t("auth.actions.termsOfService")}</button>
                        <span className="lp-legal-sep">&bull;</span>
                        <button type="button" onClick={() => setLegalModal("privacy")}>{t("auth.actions.privacyPolicy")}</button>
                    </div>
                </div>

            {/* ── Forgot Password Modal ── */}
            {showForgotModal && (
                <div className="lp-modal-backdrop" onClick={() => setShowForgotModal(false)} role="dialog" aria-modal="true">
                    <div className="lp-modal-card" onClick={e => e.stopPropagation()}>
                        <div className="lp-modal-header">
                            <div className="lp-modal-title-group">
                                <KeyRound size={20} className="lp-modal-icon" />
                                <h3>{t("auth.modal.recoveryTitle", "Account Access Recovery")}</h3>
                            </div>
                            <button
                                type="button"
                                className="lp-modal-close"
                                onClick={() => setShowForgotModal(false)}
                                aria-label="Close"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="lp-modal-body">
                            {!forgotSubmitted ? (
                                <form
                                    onSubmit={e => {
                                        e.preventDefault();
                                        if (!forgotEmail || !forgotEmail.includes("@")) {
                                            showToast("Please enter a valid email address", "error");
                                            return;
                                        }
                                        setForgotSubmitted(true);
                                        showToast("Recovery dispatch request submitted", "success");
                                    }}
                                    className="lp-modal-form"
                                >
                                    <p className="lp-modal-desc">
                                        Enter your registered official email. The Smart-Infra security gateway will generate a one-time access token or alert your organization's system administrator.
                                    </p>
                                    <div className="lp-field">
                                        <label>{t("auth.fields.email", "Email Address")}</label>
                                        <div className="lp-input-wrap">
                                            <Mail size={15} className="lp-input-icon" />
                                            <input
                                                type="email"
                                                value={forgotEmail}
                                                onChange={e => setForgotEmail(e.target.value)}
                                                placeholder="e.g. officer@smartinfra.io"
                                                required
                                                autoFocus
                                            />
                                        </div>
                                    </div>
                                    <div className="lp-modal-tip">
                                        <Info size={14} className="lp-modal-tip-icon" />
                                        <span>For emergency road network lockout, contact the 24/7 Operations Hub desk directly at <strong>dispatch@smartinfra.local</strong>.</span>
                                    </div>
                                    <div className="lp-modal-actions">
                                        <button
                                            type="button"
                                            className="lp-modal-btn secondary"
                                            onClick={() => setShowForgotModal(false)}
                                        >
                                            Cancel
                                        </button>
                                        <button type="submit" className="lp-modal-btn primary">
                                            Send Reset Instructions
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="lp-modal-success">
                                    <div className="lp-modal-success-icon">
                                        <Check size={28} />
                                    </div>
                                    <h4>Recovery Request Dispatched</h4>
                                    <p>
                                        We sent an access reset dispatch to <strong>{forgotEmail}</strong>. Please check your inbox and secondary spam filters.
                                    </p>
                                    <button
                                        type="button"
                                        className="lp-modal-btn primary"
                                        style={{ width: "100%", marginTop: "16px" }}
                                        onClick={() => setShowForgotModal(false)}
                                    >
                                        Back to Sign In
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Legal / Policy Modal ── */}
            {legalModal && (
                <div className="lp-modal-backdrop" onClick={() => setLegalModal(null)} role="dialog" aria-modal="true">
                    <div className="lp-modal-card lp-modal-card-lg" onClick={e => e.stopPropagation()}>
                        <div className="lp-modal-header">
                            <div className="lp-modal-title-group">
                                <Shield size={20} className="lp-modal-icon" />
                                <h3>
                                    {legalModal === "terms"
                                        ? t("auth.actions.termsOfService", "Terms of Service")
                                        : t("auth.actions.privacyPolicy", "Privacy & Telemetry Policy")}
                                </h3>
                            </div>
                            <button
                                type="button"
                                className="lp-modal-close"
                                onClick={() => setLegalModal(null)}
                                aria-label="Close"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="lp-modal-body lp-legal-content">
                            {legalModal === "terms" ? (
                                <>
                                    <h4>1. Civic Network Access</h4>
                                    <p>Smart-Infra platform is deployed for municipal road distress reporting, live automated telemetry analysis, and maintenance crew dispatch.</p>
                                    <h4>2. Authorized Surveillance & GIS Triage</h4>
                                    <p>Users authorized under Administrative and Field Engineer roles agree that road defect markers, GIS coordinates, and triage statuses are synchronized in real-time across central command.</p>
                                    <h4>3. Automated Dispatch Disclaimer</h4>
                                    <p>Automated AI severity scoring and pothole bounding polygons generated by computer vision models provide decision support. Municipal sign-off remains standard protocol.</p>
                                </>
                            ) : (
                                <>
                                    <h4>1. Telemetry and Location Coordinates</h4>
                                    <p>Citizen reports and field vehicle sensor telemetries transmit GPS latitude, longitude, and device headings strictly for spatial clustering and pothole geolocation.</p>
                                    <h4>2. Cryptographic Storage & Encryption</h4>
                                    <p>All authentication tokens, encrypted passphrases, and administrative keys are stored using industry-standard hashing (bcrypt) and protected under TLS 1.3 encryption in transit.</p>
                                    <h4>3. Data Retention</h4>
                                    <p>High-resolution inspection media and defect audit trails are retained in compliance with regional municipal archival statutes.</p>
                                </>
                            )}
                            <div className="lp-modal-actions" style={{ marginTop: "24px" }}>
                                <button
                                    type="button"
                                    className="lp-modal-btn primary"
                                    onClick={() => setLegalModal(null)}
                                >
                                    Acknowledge & Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            </div>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

                *, *::before, *::after { box-sizing: border-box; }

                .lp-root,
                .lp-root * {
                    color-scheme: dark;
                }
                .lp-root :is(h1, h2, h3, h4, h5, h6, .lp-card-title) {
                    color: #ffffff !important;
                }
                .lp-root .lp-card-sub {
                    color: rgba(255, 255, 255, 0.75) !important;
                }
                .lp-root .lp-tagline {
                    color: rgba(255, 255, 255, 0.85) !important;
                }
                .lp-root .lp-field label {
                    color: rgba(255, 255, 255, 0.85) !important;
                }
                .lp-root .lp-toggle button {
                    color: rgba(255, 255, 255, 0.75) !important;
                }
                .lp-root .lp-toggle button.active {
                    color: #ffffff !important;
                    background: rgba(56, 189, 248, 0.25) !important;
                    box-shadow: 0 2px 10px rgba(56, 189, 248, 0.25) !important;
                }
                .lp-root .lp-toggle button:not(.active):hover {
                    color: #ffffff !important;
                    background: rgba(255, 255, 255, 0.1) !important;
                }
                .lp-root .lp-input-wrap input {
                    color: #ffffff !important;
                }
                .lp-root .lp-input-wrap input::placeholder {
                    color: rgba(255, 255, 255, 0.45) !important;
                }
                .lp-root .lp-input-wrap input:focus {
                    border-color: #38bdf8 !important;
                    box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.25) !important;
                }
                .lp-root .lp-remember span {
                    color: rgba(255, 255, 255, 0.75) !important;
                }
                .lp-root .lp-forgot {
                    color: #38bdf8 !important;
                }
                .lp-root .lp-forgot:hover {
                    color: #7dd3fc !important;
                }
                .lp-root .lp-submit {
                    color: #ffffff !important;
                    background: linear-gradient(135deg, #0284c7, #38bdf8) !important;
                    box-shadow: 0 4px 16px rgba(56, 189, 248, 0.35) !important;
                }
                .lp-root .lp-submit:hover:not(:disabled) {
                    background: linear-gradient(135deg, #0ea5e9, #0284c7) !important;
                    box-shadow: 0 6px 20px rgba(56, 189, 248, 0.45) !important;
                }
                .lp-root .lp-switch {
                    color: rgba(255, 255, 255, 0.75) !important;
                }
                .lp-root .lp-switch button {
                    color: #38bdf8 !important;
                }
                .lp-root .lp-legal button {
                    color: rgba(255, 255, 255, 0.55) !important;
                }
                .lp-root .lp-legal button:hover {
                    color: #ffffff !important;
                }
                .lp-root { color: #ffffff;
                    display: flex; min-height: 100vh; min-height: 100dvh; height: 100vh; height: 100dvh; width: 100%;
                    overflow: hidden; position: relative;
                    background: #050814;
                    font-family: 'Inter', 'Plus Jakarta Sans', sans-serif;
                }
                .lp-video-backdrop {
                    position: absolute;
                    inset: 0;
                    width: 100%;
                    height: 100%;
                    overflow: hidden;
                    z-index: 0;
                    pointer-events: none;
                    background: #050814;
                }
                .lp-bg-video {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    min-width: 100%;
                    min-height: 100%;
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transform: translate3d(-50%, -50%, 0) scale(1.04);
                    -webkit-transform: translate3d(-50%, -50%, 0) scale(1.04);
                    filter: blur(1px) brightness(0.72) saturate(1.1);
                    -webkit-filter: blur(1px) brightness(0.72) saturate(1.1);
                    will-change: transform, filter;
                    backface-visibility: hidden;
                    -webkit-backface-visibility: hidden;
                    pointer-events: none;
                    animation: lp-video-fade-in 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                @keyframes lp-video-fade-in {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
                .lp-video-overlay {
                    position: absolute;
                    inset: 0;
                    background: radial-gradient(
                        circle at 50% 50%,
                        rgba(5, 8, 20, 0.35) 0%,
                        rgba(10, 15, 30, 0.45) 60%,
                        rgba(5, 8, 20, 0.65) 100%
                    );
                    backdrop-filter: blur(1.5px);
                    -webkit-backdrop-filter: blur(1.5px);
                    pointer-events: none;
                }

                /* ── Toast ── */
                .lp-toast {
                    position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
                    z-index: 200; display: flex; align-items: center; gap: 10px;
                    padding: 11px 16px 11px 14px; border-radius: 14px;
                    font-size: 0.84rem; font-weight: 600; white-space: nowrap;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.45);
                    animation: lp-slide-toast 0.35s cubic-bezier(0.16, 1, 0.3, 1);
                    border: 1px solid transparent;
                }
                .lp-toast-info    { background: rgba(99,102,241,0.95); color: #fff; border-color: rgba(165,180,252,0.3); }
                .lp-toast-success { background: rgba(16,185,129,0.95); color: #fff; border-color: rgba(110,231,183,0.3); }
                .lp-toast-error   { background: rgba(239,68,68,0.95);  color: #fff; border-color: rgba(252,165,165,0.3); }
                .lp-toast-close { background: none; border: none; color: rgba(255,255,255,0.7); cursor: pointer; padding: 0; display: flex; margin-left: 4px; }
                .lp-toast-close:hover { color: white; }
                @keyframes lp-slide-toast { from { transform: translate(-50%, -18px); opacity: 0; } }
                .lp-toast-icon { animation: lp-pulse-icon 1.2s ease-in-out infinite; }
                @keyframes lp-pulse-icon { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }

                /* ── Brand ── */
                .lp-brand {
                    flex: 1; display: flex; align-items: center; justify-content: center;
                    padding: clamp(20px, 4vw, 48px); position: relative; z-index: 1; height: 100vh;
                    overflow: hidden;
                }

                /* Floating particles */
                .lp-particles { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
                .lp-particle {
                    position: absolute; border-radius: 50%;
                    background: radial-gradient(circle, rgba(99,102,241,0.25), transparent 70%);
                    animation: lp-float linear infinite;
                }
                .lp-particle-1 { width: 200px; height: 200px; top: 10%; left: 5%; animation-duration: 18s; }
                .lp-particle-2 { width: 120px; height: 120px; top: 60%; left: 15%; animation-duration: 14s; animation-delay: -3s; background: radial-gradient(circle, rgba(6,182,212,0.2), transparent 70%); }
                .lp-particle-3 { width: 160px; height: 160px; top: 30%; right: 8%; animation-duration: 20s; animation-delay: -7s; background: radial-gradient(circle, rgba(16,185,129,0.18), transparent 70%); }
                .lp-particle-4 { width: 90px; height: 90px; bottom: 20%; left: 40%; animation-duration: 12s; animation-delay: -2s; }
                .lp-particle-5 { width: 140px; height: 140px; top: 75%; right: 20%; animation-duration: 16s; animation-delay: -5s; background: radial-gradient(circle, rgba(139,92,246,0.2), transparent 70%); }
                .lp-particle-6 { width: 80px; height: 80px; top: 5%; right: 35%; animation-duration: 22s; animation-delay: -10s; background: radial-gradient(circle, rgba(6,182,212,0.15), transparent 70%); }
                @keyframes lp-float {
                    0%   { transform: translate(0, 0) scale(1); opacity: 0.6; }
                    25%  { transform: translate(30px, -40px) scale(1.1); opacity: 0.8; }
                    50%  { transform: translate(-20px, -80px) scale(0.9); opacity: 0.5; }
                    75%  { transform: translate(40px, -30px) scale(1.05); opacity: 0.7; }
                    100% { transform: translate(0, 0) scale(1); opacity: 0.6; }
                }

                .lp-brand-inner {
                    max-width: 520px;
                    display: flex; flex-direction: column; align-items: center; text-align: center;
                    position: relative; z-index: 2;
                }

                /* Logo with glow ring */
                .lp-logo-wrap {
                    position: relative;
                    margin-bottom: clamp(16px, 2.5vh, 28px);
                }
                .lp-logo-ring {
                    position: absolute; inset: -10px; border-radius: clamp(28px, 4.2vw, 38px);
                    border: 2px solid rgba(99,102,241,0.25);
                    animation: lp-ring-glow 3s ease-in-out infinite;
                }
                @keyframes lp-ring-glow {
                    0%, 100% { border-color: rgba(99,102,241,0.2); box-shadow: 0 0 24px rgba(99,102,241,0.12); }
                    50%      { border-color: rgba(99,102,241,0.45); box-shadow: 0 0 48px rgba(99,102,241,0.25); }
                }
                .lp-logo {
                    width: clamp(96px, 11vw, 132px); height: clamp(96px, 11vw, 132px);
                    border-radius: clamp(22px, 3.6vw, 32px); overflow: hidden;
                    display: flex; align-items: center; justify-content: center;
                    background: #0a0f1e; position: relative;
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    box-shadow: 0 20px 60px rgba(0,0,0,0.65), 0 0 35px rgba(99,102,241,0.25);
                }

                .lp-product {
                    font-size: clamp(2rem, 4vw, 3.2rem); font-weight: 900;
                    letter-spacing: -0.045em; margin: 0 0 10px;
                    line-height: 1.1;
                }
                .lp-product-main {
                    background: linear-gradient(135deg, #fff 35%, #a5b4fc 75%, #818cf8);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    display: inline-block;
                }
                .lp-product-ai {
                    background: linear-gradient(135deg, #f97316, #8b5cf6) !important;
                    -webkit-background-clip: text !important;
                    -webkit-text-fill-color: transparent !important;
                    background-clip: text !important;
                    display: inline-block;
                    filter: drop-shadow(0 0 16px rgba(249, 115, 22, 0.45));
                }
                .lp-tagline {
                    font-size: clamp(0.9rem, 1.4vw, 1.05rem); color: rgba(255,255,255,0.78);
                    line-height: 1.55; margin: 0 0 24px; font-weight: 400;
                }

                /* Stats ticker */
                .lp-stats-row {
                    display: flex; align-items: center; gap: 0;
                    padding: 12px 24px; border-radius: 16px;
                    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
                    margin-bottom: 24px; width: 100%;
                    backdrop-filter: blur(8px);
                    animation: lp-fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
                }
                .lp-stat { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; }
                .lp-stat-num {
                    font-size: 1.25rem; font-weight: 800; letter-spacing: -0.03em;
                    background: linear-gradient(135deg, #c7d2fe, #818cf8);
                    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
                }
                .lp-stat-label { font-size: 0.65rem; font-weight: 600; color: rgba(255,255,255,0.6); text-transform: uppercase; letter-spacing: 0.06em; }
                .lp-stat-divider { width: 1px; height: 32px; background: rgba(255,255,255,0.12); margin: 0 4px; }

                /* Feature cards */
                .lp-feature-list {
                    display: flex; flex-direction: column; gap: 10px;
                    margin-bottom: 24px; width: 100%;
                }
                .lp-feature {
                    display: flex; align-items: center; gap: 14px;
                    padding: 11px 16px; border-radius: 14px;
                    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
                    color: rgba(255,255,255,0.85);
                    transition: all 0.25s ease; cursor: default;
                    animation: lp-fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
                }
                .lp-feature:hover {
                    background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.18);
                    color: #ffffff;
                    transform: translateX(4px);
                }
                .lp-feature-icon {
                    width: 38px; height: 38px; border-radius: 12px;
                    display: flex; align-items: center; justify-content: center;
                    flex-shrink: 0; transition: transform 0.2s;
                }
                .lp-feature:hover .lp-feature-icon { transform: scale(1.08); }
                .lp-feature-content { display: flex; flex-direction: column; gap: 2px; text-align: left; }
                .lp-feature-title { font-size: 0.85rem; font-weight: 700; color: #ffffff; }
                .lp-feature-desc { font-size: 0.7rem; font-weight: 400; color: rgba(255,255,255,0.65); line-height: 1.4; }

                @keyframes lp-fade-up {
                    from { opacity: 0; transform: translateY(16px); }
                    to   { opacity: 1; transform: translateY(0); }
                }

                /* Status bar */
                .lp-status-bar {
                    display: inline-flex; align-items: center; gap: 9px;
                    padding: 7px 16px; border-radius: 99px;
                    border: 1px solid rgba(16,185,129,0.3); background: rgba(16,185,129,0.07);
                    color: #10b981; font-size: 0.74rem; font-weight: 700; letter-spacing: 0.02em;
                    margin-bottom: 12px;
                }
                .lp-status-dot {
                    width: 7px; height: 7px; border-radius: 50%; background: #10b981;
                    box-shadow: 0 0 0 3px rgba(16,185,129,0.25);
                    animation: lp-pulse-dot 2.2s ease-in-out infinite;
                }
                .lp-status-sep { color: rgba(16,185,129,0.3); font-size: 0.6rem; }
                .lp-status-latency { color: rgba(16,185,129,0.6); font-weight: 500; }
                @keyframes lp-pulse-dot {
                    0%,100% { box-shadow: 0 0 0 3px rgba(16,185,129,0.25); }
                    50%     { box-shadow: 0 0 0 7px rgba(16,185,129,0); }
                }

                /* Trust badge */
                .lp-trust {
                    display: flex; align-items: center; gap: 8px;
                    font-size: 0.68rem; font-weight: 500; color: rgba(255,255,255,0.22);
                    letter-spacing: 0.02em;
                }
                .lp-trust svg { color: rgba(255,255,255,0.2); }

                /* ── Auth panel ── */
                .lp-auth {
                    width: clamp(480px, 42vw, 580px); flex-shrink: 0;
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    padding: 24px 32px; position: relative; z-index: 1; height: 100vh;
                    background: transparent; border-left: none;
                    backdrop-filter: none; -webkit-backdrop-filter: none;
                    box-sizing: border-box; overflow-y: auto; scrollbar-width: none;
                }
                .lp-auth::-webkit-scrollbar { display: none; }
                .lp-card {
                    width: 100%; max-width: 500px;
                    background: rgba(10, 15, 30, 0.42);
                    backdrop-filter: blur(4px);
                    -webkit-backdrop-filter: blur(4px);
                    border: 1px solid rgba(255, 255, 255, 0.14);
                    border-radius: 24px;
                    padding: 34px 36px;
                    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.12);
                    transition: transform 0.3s ease;
                    margin: auto 0;
                    max-height: calc(100vh - 40px);
                    overflow-y: auto; overflow-x: hidden;
                    scrollbar-width: none;
                }
                .lp-card::-webkit-scrollbar { display: none; }
                .lp-shake { animation: lp-shake 0.45s cubic-bezier(.36,.07,.19,.97) both; }
                @keyframes lp-shake {
                    10%, 90% { transform: translate3d(-1px, 0, 0); }
                    20%, 80% { transform: translate3d(2px, 0, 0); }
                    30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
                    40%, 60% { transform: translate3d(4px, 0, 0); }
                }

                /* ── Toggle tabs ── */
                .lp-toggle {
                    display: flex; background: rgba(255,255,255,0.06);
                    border-radius: 12px; padding: 4px; margin-bottom: 22px;
                    border: 1px solid rgba(255,255,255,0.12);
                    gap: 4px;
                }
                .lp-toggle button {
                    flex: 1; padding: 10px 14px; border: none; border-radius: 9px;
                    background: transparent; color: rgba(255,255,255,0.7);
                    font-size: 0.9rem; font-weight: 700; cursor: pointer;
                    transition: all 0.22s ease; font-family: inherit; letter-spacing: 0.01em;
                }
                .lp-toggle button.active {
                    background: rgba(99,102,241,0.3); color: #ffffff;
                    box-shadow: 0 2px 10px rgba(99,102,241,0.25);
                }
                .lp-toggle button:not(.active):hover { color: #ffffff; background: rgba(255,255,255,0.1); }

                /* ── Card header ── */
                .lp-card-title {
                    font-size: 1.8rem; font-weight: 800; color: #ffffff;
                    margin: 0 0 6px; letter-spacing: -0.03em; line-height: 1.2;
                }
                .lp-card-sub {
                    font-size: 0.92rem; color: rgba(255,255,255,0.72);
                    margin: 0 0 22px; font-weight: 400; line-height: 1.45;
                }

                /* ── Form ── */
                .lp-form { display: flex; flex-direction: column; gap: 14px; }
                .lp-signup-fields {
                    max-height: 0; overflow: hidden; opacity: 0;
                    transition: max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease;
                    display: flex; flex-direction: column; gap: 14px;
                }
                .lp-signup-fields.active { max-height: 600px; opacity: 1; }

                /* ── Fields ── */
                .lp-field { display: flex; flex-direction: column; gap: 7px; }
                .lp-field label {
                    font-size: 0.8rem; font-weight: 700; color: rgba(255,255,255,0.85);
                    text-transform: uppercase; letter-spacing: 0.07em;
                }
                .lp-field-hint {
                    font-size: 0.78rem; font-weight: 500; margin-top: 2px;
                    display: flex; align-items: center; gap: 5px;
                }
                .lp-field-hint.error { color: #fca5a5; }
                .lp-field-hint.ok    { color: #6ee7b7; }

                /* ── Role toggle ── */
                .lp-role-toggle {
                    display: flex;
                    background: rgba(255,255,255,0.06);
                    border: 1px solid rgba(255,255,255,0.12);
                    border-radius: 12px; padding: 4px; gap: 4px;
                }
                .lp-role-toggle button {
                    flex: 1; border: none; border-radius: 9px;
                    background: transparent; color: rgba(255,255,255,0.7);
                    font-size: 0.88rem; font-weight: 700; cursor: pointer;
                    padding: 10px 12px; transition: all 0.2s ease; font-family: inherit;
                }
                .lp-role-toggle button.active {
                    background: rgba(99,102,241,0.35); color: #ffffff;
                    box-shadow: 0 2px 8px rgba(99,102,241,0.2);
                }
                .lp-role-toggle button:not(.active):hover { background: rgba(255,255,255,0.1); color: #ffffff; }

                /* ── Inputs ── */
                .lp-input-wrap {
                    position: relative; display: flex; align-items: center;
                    width: 100%; transition: all 0.2s;
                }
                .lp-input-icon { position: absolute; left: 16px; color: rgba(255,255,255,0.45); pointer-events: none; transition: color 0.2s; }
                .lp-input-wrap input {
                    width: 100%; padding: 13px 18px 13px 46px; box-sizing: border-box;
                    background: rgba(255,255,255,0.06); border: 1.5px solid rgba(255,255,255,0.15);
                    border-radius: 13px; color: #ffffff; font-size: 0.98rem; font-family: inherit;
                    outline: none; transition: all 0.22s; font-weight: 500;
                }
                .lp-input-wrap input::placeholder { color: rgba(255,255,255,0.42); font-weight: 400; }
                .lp-input-wrap input:focus {
                    border-color: #6366f1; background: rgba(99,102,241,0.1);
                    box-shadow: 0 0 0 3px rgba(99,102,241,0.25);
                }
                .lp-input-wrap input:focus + .lp-input-icon,
                .lp-input-wrap:focus-within .lp-input-icon { color: #a5b4fc; }
                .lp-input-wrap input:focus-visible { outline: none; }

                /* Valid / invalid states */
                .lp-input-valid input   { border-color: rgba(16,185,129,0.5) !important; }
                .lp-input-invalid input { border-color: rgba(239,68,68,0.5) !important; }
                .lp-input-status { position: absolute; right: 14px; pointer-events: none; }
                .lp-input-status.valid   { color: #10b981; }
                .lp-input-status.invalid { color: #ef4444; }

                /* Eye toggle */
                .lp-eye {
                    position: absolute; right: 13px; background: none; border: none;
                    color: rgba(255,255,255,0.45); cursor: pointer; padding: 4px; display: flex;
                    border-radius: 6px; transition: color 0.2s, background 0.2s;
                }
                .lp-eye:hover { color: #ffffff; background: rgba(255,255,255,0.1); }

                /* ── Password strength ── */
                .lp-strength { margin-top: 9px; display: flex; align-items: center; gap: 10px; }
                .lp-strength-bars { display: flex; gap: 5px; flex: 1; }
                .lp-strength-bar {
                    height: 4px; flex: 1; border-radius: 3px;
                    background: rgba(255,255,255,0.12); transition: background 0.35s ease;
                }
                .lp-strength-text { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; width: 50px; text-align: right; transition: color 0.3s; }

                /* ── Extras row ── */
                .lp-extras { display: flex; align-items: center; justify-content: space-between; margin-top: 2px; }
                .lp-remember { display: flex; align-items: center; gap: 10px; cursor: pointer; user-select: none; }
                .lp-remember:hover span { color: #ffffff; }
                .lp-remember input {
                    appearance: none; -webkit-appearance: none;
                    width: 15px; height: 15px; border-radius: 5px;
                    border: 1.5px solid rgba(255,255,255,0.25);
                    background: rgba(255,255,255,0.06);
                    cursor: pointer; position: relative;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    flex-shrink: 0; margin: 0;
                }
                .lp-remember input:checked { background: #6366f1; border-color: #6366f1; box-shadow: 0 0 12px rgba(99,102,241,0.35); }
                .lp-remember input:checked::after {
                    content: ''; position: absolute; left: 4px; top: 1.5px;
                    width: 3.5px; height: 7px; border: solid white;
                    border-width: 0 1.5px 1.5px 0; transform: rotate(45deg);
                    animation: lp-check-pop 0.18s ease-out;
                }
                @keyframes lp-check-pop {
                    from { transform: rotate(45deg) scale(0.4); opacity: 0; }
                    to   { transform: rotate(45deg) scale(1); opacity: 1; }
                }
                .lp-remember span { font-size: 0.88rem; font-weight: 500; color: rgba(255,255,255,0.7); transition: color 0.2s; }
                .lp-forgot { background: none; border: none; color: #a5b4fc; font-size: 0.84rem; font-weight: 600; cursor: pointer; padding: 0; transition: color 0.2s; }
                .lp-forgot:hover { color: #c7d2fe; text-decoration: underline; }

                /* ── Error banner ── */
                .lp-error {
                    display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px;
                    border-radius: 12px; background: rgba(239,68,68,0.15);
                    border: 1px solid rgba(239,68,68,0.35); color: #fca5a5;
                    font-size: 0.82rem; font-weight: 500; line-height: 1.45;
                    animation: lp-error-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                @keyframes lp-error-in { from { opacity: 0; transform: translateY(-6px); } }
                .lp-error-icon { flex-shrink: 0; margin-top: 1px; color: #f87171; }
                .lp-error span { flex: 1; }
                .lp-error-dismiss {
                    background: none; border: none; color: rgba(252,165,165,0.7);
                    cursor: pointer; padding: 0; display: flex; flex-shrink: 0;
                    border-radius: 4px; transition: color 0.2s;
                }
                .lp-error-dismiss:hover { color: #ffffff; }

                /* ── Submit button ── */
                .lp-submit {
                    margin-top: 6px; padding: 14px 18px;
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    border: none; border-radius: 13px; color: #ffffff;
                    font-size: 1rem; font-weight: 700; cursor: pointer;
                    display: flex; align-items: center; justify-content: center; gap: 9px;
                    transition: all 0.22s; box-shadow: 0 4px 22px rgba(99,102,241,0.38);
                    font-family: inherit; letter-spacing: 0.01em; width: 100%;
                }
                .lp-submit:hover:not(:disabled) {
                    transform: translateY(-1px);
                    box-shadow: 0 8px 32px rgba(99,102,241,0.52);
                    background: linear-gradient(135deg, #6d70f7, #9461fc);
                }
                .lp-submit:active:not(:disabled) { transform: translateY(0); }
                .lp-submit:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
                .lp-spinner {
                    width: 15px; height: 15px;
                    border: 2.5px solid rgba(255,255,255,0.35);
                    border-top-color: white; border-radius: 50%;
                    animation: lp-spin 0.55s linear infinite; flex-shrink: 0;
                }
                @keyframes lp-spin { to { transform: rotate(360deg); } }

                /* ── Social ── */
                .lp-social { margin-top: 18px; }
                .lp-social-div {
                    display: flex; align-items: center; gap: 12px;
                    font-size: 0.76rem; color: rgba(255,255,255,0.55);
                    text-transform: uppercase; font-weight: 700; margin-bottom: 14px; letter-spacing: 0.08em;
                }
                .lp-social-div::before, .lp-social-div::after { content: ''; flex: 1; height: 1px; background: rgba(255,255,255,0.12); }
                .lp-social-btns { display: flex; gap: 12px; justify-content: center; }
                .lp-google-wrapper {
                    width: 100%; display: flex; justify-content: center;
                    transform: scale(0.96); transition: transform 0.22s ease;
                }
                .lp-google-wrapper:hover { transform: scale(1); }

                /* ── Switch ── */
                .lp-switch { text-align: center; margin: 20px 0 10px; font-size: 0.9rem; color: rgba(255,255,255,0.72); }
                .lp-switch button {
                    background: none; border: none; color: #a5b4fc; font-weight: 700;
                    cursor: pointer; font-family: inherit; font-size: inherit; transition: color 0.2s;
                }
                .lp-switch button:hover { color: #c7d2fe; text-decoration: underline; }

                /* ── Legal ── */
                .lp-legal {
                    display: flex; align-items: center; justify-content: center; gap: 14px;
                    margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1);
                }
                .lp-legal button {
                    background: none; border: none; color: rgba(255,255,255,0.55);
                    font-size: 0.78rem; font-weight: 600; cursor: pointer;
                    font-family: inherit; transition: color 0.2s; letter-spacing: 0.02em;
                }
                .lp-legal button:hover { color: #ffffff; }
                .lp-legal-sep { color: rgba(255,255,255,0.3); font-size: 0.55rem; }

                /* ── Responsive ── */
                @media (max-width: 1024px) {
                    .lp-auth { width: 500px; }
                    .lp-product { font-size: 2.8rem; }
                }
                @media (max-width: 900px) {
                    .lp-auth { width: 460px; padding-left: 24px; padding-right: 24px; }
                }
                @media (max-width: 768px) {
                    .lp-brand { display: none; }
                    .lp-auth { width: 100%; border-left: none; padding: 24px 16px 40px; }
                    .lp-card { max-width: 480px; margin: auto; padding: 28px 22px; }
                    .lp-card-title { font-size: 1.6rem; }
                    .lp-card-sub { margin-bottom: 20px; font-size: 0.88rem; }
                    .lp-toggle { margin-bottom: 22px; }
                    .lp-field label { font-size: 0.76rem; }
                    .lp-role-toggle button { font-size: 0.84rem; padding: 9px 10px; }
                    .lp-input-wrap input { font-size: 0.94rem; }
                    .lp-submit { font-size: 0.95rem; padding: 13px; }
                }
                @media (max-width: 420px) {
                    .lp-auth { padding: 16px 12px 32px; }
                    .lp-card { padding: 24px 16px; border-radius: 20px; }
                }
            
                /* ── Improvements Styles ── */
                .lp-field-header-row {
                    display: flex; align-items: center; justify-content: space-between;
                }
                .lp-helper-badge-btn {
                    display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px;
                    border-radius: 9999px; font-size: 0.68rem; font-weight: 700;
                    letter-spacing: 0.04em; background: rgba(56, 189, 248, 0.12);
                    border: 1px solid rgba(56, 189, 248, 0.3); color: #38bdf8;
                    cursor: pointer; transition: all 0.2s ease;
                }
                .lp-helper-badge-btn:hover {
                    background: rgba(56, 189, 248, 0.22); border-color: #38bdf8;
                    color: #e0f2fe; transform: translateY(-1px);
                }

                .lp-caps-badge {
                    display: inline-flex; align-items: center; gap: 6px;
                    margin-top: 5px; padding: 4px 10px; border-radius: 8px;
                    background: rgba(245, 158, 11, 0.14);
                    border: 1px solid rgba(245, 158, 11, 0.35);
                    color: #fbbf24; font-size: 0.72rem; font-weight: 600;
                    letter-spacing: 0.02em; animation: lp-fade-in 0.2s ease-out;
                }
                @keyframes lp-fade-in {
                    from { opacity: 0; transform: translateY(-3px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .lp-pw-checklist {
                    display: flex; flex-wrap: wrap; gap: 6px 10px;
                    margin-top: 8px; padding: 8px 10px; border-radius: 9px;
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.07);
                }
                .lp-pw-req {
                    display: inline-flex; align-items: center; gap: 5px;
                    font-size: 0.7rem; font-weight: 600; color: rgba(255, 255, 255, 0.4);
                    transition: all 0.2s ease;
                }
                .lp-pw-req.met { color: #34d399; }
                .lp-req-dot {
                    width: 5px; height: 5px; border-radius: 50%;
                    background: rgba(255, 255, 255, 0.3);
                }

                /* ── Modals ── */
                .lp-modal-backdrop {
                    position: fixed; inset: 0; z-index: 1000;
                    display: flex; align-items: center; justify-content: center;
                    padding: 16px; background: rgba(3, 7, 18, 0.78);
                    backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
                    animation: lp-modal-fade 0.2s ease-out;
                }
                @keyframes lp-modal-fade { from { opacity: 0; } to { opacity: 1; } }
                .lp-modal-card {
                    position: relative; width: 100%; max-width: 440px;
                    border-radius: 20px; background: #0b1120;
                    border: 1px solid rgba(255, 255, 255, 0.14);
                    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(56, 189, 248, 0.15);
                    overflow: hidden; animation: lp-modal-pop 0.24s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .lp-modal-card-lg { max-width: 580px; }
                @keyframes lp-modal-pop {
                    from { opacity: 0; transform: scale(0.94) translateY(8px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                .lp-modal-header {
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 18px 20px 14px; border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                }
                .lp-modal-title-group { display: flex; align-items: center; gap: 10px; }
                .lp-modal-icon { color: #38bdf8; }
                .lp-modal-title-group h3 { margin: 0; font-size: 1.05rem; font-weight: 700; color: #ffffff !important; }
                .lp-modal-close {
                    background: transparent; border: none; color: rgba(255, 255, 255, 0.5);
                    cursor: pointer; padding: 6px; border-radius: 8px;
                    display: flex; align-items: center; justify-content: center; transition: all 0.2s;
                }
                .lp-modal-close:hover { color: #ffffff; background: rgba(255, 255, 255, 0.1); }
                .lp-modal-body { padding: 20px; }
                .lp-modal-form { display: flex; flex-direction: column; gap: 16px; }
                .lp-modal-desc { margin: 0; font-size: 0.86rem; line-height: 1.5; color: rgba(255, 255, 255, 0.72); }
                .lp-modal-tip {
                    display: flex; align-items: flex-start; gap: 9px; padding: 10px 12px;
                    border-radius: 10px; background: rgba(56, 189, 248, 0.07);
                    border: 1px solid rgba(56, 189, 248, 0.2); font-size: 0.76rem;
                    line-height: 1.45; color: #bae6fd;
                }
                .lp-modal-tip-icon { flex-shrink: 0; margin-top: 1px; color: #38bdf8; }
                .lp-modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px; }
                .lp-modal-btn {
                    padding: 10px 18px; border-radius: 10px; font-size: 0.88rem;
                    font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.2s ease;
                }
                .lp-modal-btn.secondary {
                    background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.12);
                    color: rgba(255, 255, 255, 0.8);
                }
                .lp-modal-btn.secondary:hover { background: rgba(255, 255, 255, 0.12); color: #ffffff; }
                .lp-modal-btn.primary {
                    background: linear-gradient(135deg, #0284c7, #38bdf8); border: none;
                    color: #ffffff; box-shadow: 0 2px 10px rgba(56, 189, 248, 0.35);
                }
                .lp-modal-btn.primary:hover {
                    background: linear-gradient(135deg, #0ea5e9, #0284c7);
                    box-shadow: 0 4px 16px rgba(56, 189, 248, 0.45);
                }
                .lp-modal-success { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 10px 4px 6px; }
                .lp-modal-success-icon {
                    width: 52px; height: 52px; border-radius: 50%;
                    background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4);
                    color: #34d399; display: flex; align-items: center; justify-content: center; margin-bottom: 14px;
                }
                .lp-modal-success h4 { margin: 0 0 8px; font-size: 1.15rem; font-weight: 700; color: #ffffff; }
                .lp-modal-success p { margin: 0; font-size: 0.88rem; color: rgba(255, 255, 255, 0.72); line-height: 1.5; }
                .lp-legal-content { max-height: 60vh; overflow-y: auto; padding-right: 14px; }
                .lp-legal-content h4 { margin: 14px 0 6px; font-size: 0.92rem; font-weight: 700; color: #38bdf8; }
                .lp-legal-content h4:first-child { margin-top: 0; }
                .lp-legal-content p { margin: 0 0 10px; font-size: 0.84rem; line-height: 1.55; color: rgba(255, 255, 255, 0.75); }

                @media (prefers-reduced-motion: reduce) {
                    .lp-video-backdrop,
                    .lp-bg-video {
                        display: none !important;
                    }
                    *, *::before, *::after {
                        animation-duration: 0.01ms !important;
                        transition-duration: 0.01ms !important;
                    }
                }

`}</style>
        </div>
    );
}
