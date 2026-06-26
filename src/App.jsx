import React, { useState, useEffect, useRef, useLayoutEffect, useMemo } from "react";
import {
    ArrowRight,
    ChevronLeft,
    Mail,
    Menu,
    X,
    ArrowUpRight,
    LogIn,
    Mic,
    BarChart3,
    FileText,
    History as HistoryIcon,
    Settings as SettingsIcon,
    CheckCircle2,
    Clock3,
    SlidersHorizontal,
    TrendingUp,
    User,
    Lock,
    Eye,
    EyeOff,
    Briefcase,
    Presentation,
    Upload,
    CameraOff,
    Video,
    VideoOff,
    MicOff,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";

gsap.registerPlugin(ScrollTrigger);

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------
const MetricCard = ({ label, value }) => (
    <div className="rounded-2xl border border-border/70 bg-background/35 px-4 py-3 backdrop-blur-md">
        <p className="mb-1 text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
        <p className="text-lg font-medium text-foreground">{value}</p>
    </div>
);

const SoftIcon = ({ children }) => (
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-brand-red/20 bg-brand-red/10 text-brand-red">
        {children}
    </div>
);

const StepBadge = ({ children }) => (
    <span className="rounded-full border border-brand-red/20 bg-brand-red/10 px-3 py-1 text-[11px] font-mono text-brand-red">
        {children}
    </span>
);

// Shared wrapper for all flow pages (sign-in, sign-up, quiz, …)
const FlowPage = ({ children }) => (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
        <div className="flow-page-card w-full">
            {children}
        </div>
    </div>
);

// Top bar: Prepped logo + back chevron
const FlowHeader = ({ onBack }) => (
    <div className="mb-8 flex items-center gap-3">
        <button
            type="button"
            onClick={onBack}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-brand-red hover:text-brand-red"
        >
            <ChevronLeft size={16} />
        </button>
        <span className="font-serif text-2xl italic text-foreground">Prepped.</span>
    </div>
);

// Icon-prefixed input row
const IconInput = ({ icon, right, inputRef, ...props }) => (
    <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "#7a5a55" }}>
            {icon}
        </span>
        <input ref={inputRef} className="ev-input pl-10" {...props} />
        {right && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                {right}
            </div>
        )}
    </div>
);

// ---------------------------------------------------------------------------
// Liquid background shaders
// ---------------------------------------------------------------------------
const liquidVertexShader = `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = vec4(position, 1.0); }
`;

const liquidFragmentShader = `
    uniform float uTime;
    uniform vec2 uResolution;
    uniform vec2 uMouse;
    uniform float uHover;
    varying vec2 vUv;

    vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x,289.0); }

    float snoise(vec2 v){
        const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
        vec2 i=floor(v+dot(v,C.yy)); vec2 x0=v-i+dot(i,C.xx);
        vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);
        vec4 x12=x0.xyxy+C.xxzz; x12.xy-=i1;
        i=mod(i,289.0);
        vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));
        vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);
        m=m*m; m=m*m;
        vec3 x=2.0*fract(p*C.www)-1.0; vec3 h=abs(x)-0.5; vec3 ox=floor(x+0.5); vec3 a0=x-ox;
        m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);
        vec3 g; g.x=a0.x*x0.x+h.x*x0.y; g.yz=a0.yz*x12.xz+h.yz*x12.yw;
        return 130.0*dot(m,g);
    }

    void main(){
        vec2 uv=vUv; float aspect=uResolution.x/uResolution.y;
        vec2 p=uv-0.5; p.x*=aspect;
        vec2 mouse=uMouse-0.5; mouse.x*=aspect;
        float mouseDist=distance(p,mouse);
        float mouseForce=smoothstep(0.62,0.0,mouseDist)*uHover;
        float ripple=sin(mouseDist*42.0-uTime*6.0)*0.5+0.5;
        vec2 direction=normalize(p-mouse+vec2(0.0001));
        p+=direction*mouseForce*0.33;
        float t=uTime*0.18;
        vec2 q=vec2(snoise(p*1.7+vec2(0.0,t)),snoise(p*1.7+vec2(4.8,1.9)+t));
        vec2 r=vec2(snoise(p*2.2+q*1.8+vec2(1.7,9.2)+t*0.7),snoise(p*2.2+q*1.8+vec2(8.3,2.8)+t*0.55));
        float f=snoise(p*2.1+r*2.45+mouseForce*0.8);
        vec3 deep=vec3(0.227,0.141,0.133); vec3 rose=vec3(0.667,0.278,0.380);
        vec3 blush=vec3(0.812,0.694,0.694); vec3 cream=vec3(0.914,0.894,0.859);
        float roseMix=smoothstep(-0.85,0.85,f);
        float blushMix=smoothstep(0.05,1.05,length(q));
        float shine=pow(abs(snoise(p*5.4+r+t)),7.0);
        vec3 color=mix(deep,rose,roseMix);
        color=mix(color,blush,blushMix*0.55);
        color+=cream*shine*0.22;
        color+=rose*mouseForce*ripple*0.25;
        color+=cream*mouseForce*0.12;
        float vignette=smoothstep(0.92,0.18,distance(uv,vec2(0.5)));
        color*=vignette; color=color*0.94+0.035;
        gl_FragColor=vec4(color,1.0);
    }
`;

const LiquidPreppedPlane = () => {
    const meshRef = useRef(null);
    const { size, gl } = useThree();
    const targetMouse = useRef(new THREE.Vector2(0.5, 0.5));
    const targetHover = useRef(0);
    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uHover: { value: 0 },
    }), []);

    useEffect(() => {
        const handleMouseMove = (event) => {
            const rect = gl.domElement.getBoundingClientRect();
            const x = (event.clientX - rect.left) / rect.width;
            const y = 1 - (event.clientY - rect.top) / rect.height;
            const inside = x >= 0 && x <= 1 && y >= 0 && y <= 1;
            if (inside) { targetMouse.current.set(x, y); targetHover.current = 1; }
            else { targetHover.current = 0; }
        };
        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, [gl]);

    useFrame(({ clock }) => {
        if (!meshRef.current) return;
        const m = meshRef.current.material;
        m.uniforms.uTime.value = clock.getElapsedTime();
        m.uniforms.uResolution.value.set(size.width, size.height);
        m.uniforms.uMouse.value.lerp(targetMouse.current, 0.08);
        m.uniforms.uHover.value += (targetHover.current - m.uniforms.uHover.value) * 0.08;
    });

    return (
        <mesh ref={meshRef}>
            <planeGeometry args={[2, 2]} />
            <shaderMaterial
                vertexShader={liquidVertexShader}
                fragmentShader={liquidFragmentShader}
                uniforms={uniforms}
                depthWrite={false}
                depthTest={false}
            />
        </mesh>
    );
};

const LiquidHeroBackground = () => (
    <Canvas dpr={[1, 2]} gl={{ antialias: true, alpha: false }} className="pointer-events-none absolute inset-0 h-full w-full">
        <LiquidPreppedPlane />
    </Canvas>
);

// ---------------------------------------------------------------------------
// Sign-In Page
// ---------------------------------------------------------------------------
const SignInPage = ({ navigate }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPw, setShowPw] = useState(false);

    return (
        <FlowPage>
            <FlowHeader onBack={() => navigate("landing")} />

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-red/20 bg-brand-red/10 text-brand-red">
                <LogIn size={20} />
            </div>
            <h1 className="mt-4 font-serif text-4xl leading-none text-foreground">Welcome back.</h1>
            <p className="mt-2 text-sm text-muted-foreground">Sign in to continue your practice journey.</p>

            <div className="mt-7 grid gap-3">
                <IconInput
                    icon={<User size={16} />}
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <IconInput
                    icon={<Lock size={16} />}
                    type={showPw ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    right={
                        <button
                            type="button"
                            onClick={() => setShowPw((p) => !p)}
                            className="transition-colors hover:text-foreground"
                            style={{ color: "#7a5a55" }}
                        >
                            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    }
                />
            </div>

            <button
                type="button"
                onClick={() => navigate("quiz")}
                className="ev-btn-primary mt-5"
            >
                Sign in <ArrowRight size={14} />
            </button>

            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <button
                    type="button"
                    onClick={() => navigate("signup")}
                    className="transition-colors hover:text-brand-red"
                >
                    Don't have an account? <span className="font-medium text-brand-red">Sign up</span>
                </button>
                <a href="#" className="transition-colors hover:text-brand-red">Forgot password?</a>
            </div>
        </FlowPage>
    );
};

// ---------------------------------------------------------------------------
// Sign-Up Page
// ---------------------------------------------------------------------------
const SignUpPage = ({ navigate }) => {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    return (
        <FlowPage>
            <FlowHeader onBack={() => navigate("signin")} />

            <h1 className="font-serif text-4xl leading-none text-foreground">Create account.</h1>
            <p className="mt-2 text-sm text-muted-foreground">Start your speaking practice journey today.</p>

            <div className="mt-7 grid gap-3">
                <IconInput
                    icon={<User size={16} />}
                    type="text"
                    placeholder="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
                <IconInput
                    icon={<Mail size={16} />}
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <IconInput
                    icon={<Lock size={16} />}
                    type={showPw ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    right={
                        <button
                            type="button"
                            onClick={() => setShowPw((p) => !p)}
                            className="transition-colors hover:text-foreground"
                            style={{ color: "#7a5a55" }}
                        >
                            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    }
                />
                <IconInput
                    icon={<Lock size={16} />}
                    type={showConfirm ? "text" : "password"}
                    placeholder="Confirm Password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    right={
                        <button
                            type="button"
                            onClick={() => setShowConfirm((p) => !p)}
                            className="transition-colors hover:text-foreground"
                            style={{ color: "#7a5a55" }}
                        >
                            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    }
                />
            </div>

            <button
                type="button"
                onClick={() => navigate("quiz")}
                className="ev-btn-primary mt-5"
            >
                Create account <ArrowRight size={14} />
            </button>

            <p className="mt-4 text-center text-xs text-muted-foreground">
                Already have an account?{" "}
                <button
                    type="button"
                    onClick={() => navigate("signin")}
                    className="font-medium text-brand-red transition-colors hover:underline"
                >
                    Sign in
                </button>
            </p>
        </FlowPage>
    );
};

// ---------------------------------------------------------------------------
// Quiz Page
// ---------------------------------------------------------------------------
const QuizPage = ({ navigate }) => {
    const [age, setAge] = useState("");
    const [position, setPosition] = useState("");
    const [experience, setExperience] = useState("");
    const [confidence, setConfidence] = useState("");

    return (
        <FlowPage>
            <FlowHeader onBack={() => navigate("signin")} />

            <h1 className="font-serif text-4xl leading-none text-foreground">Tell us about yourself.</h1>
            <p className="mt-2 text-sm text-muted-foreground">We'll personalize your simulation.</p>

            <div className="mt-7 grid gap-3">
                <input
                    className="ev-input"
                    type="number"
                    placeholder="Age"
                    min="10"
                    max="99"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                />
                <input
                    className="ev-input"
                    type="text"
                    placeholder="Job Position (e.g. Software Engineer)"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                />
                <select
                    className="ev-input ev-select"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                >
                    <option value="" disabled>Experience Level</option>
                    <option value="student">Student</option>
                    <option value="entry">Entry Level</option>
                    <option value="mid">Mid Level</option>
                    <option value="senior">Senior</option>
                </select>
                <select
                    className="ev-input ev-select"
                    value={confidence}
                    onChange={(e) => setConfidence(e.target.value)}
                >
                    <option value="" disabled>Confidence Level</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                </select>
            </div>

            <button
                type="button"
                onClick={() => navigate("selectmode")}
                className="ev-btn-primary mt-5"
            >
                Continue <ArrowRight size={14} />
            </button>
        </FlowPage>
    );
};

// ---------------------------------------------------------------------------
// SelectMode Page
// ---------------------------------------------------------------------------
const SelectModePage = ({ navigate, onSelectMode }) => {
    const [selected, setSelected] = useState(null);

    const modes = [
        { id: "interview", icon: <Briefcase size={26} />, label: "Job Interview", desc: "Answer AI-generated questions" },
        { id: "presentation", icon: <Presentation size={26} />, label: "Presentation", desc: "Practice your delivery" },
    ];

    return (
        <FlowPage>
            <FlowHeader onBack={() => navigate("quiz")} />

            <h1 className="font-serif text-4xl leading-none text-foreground">Choose your room.</h1>
            <p className="mt-2 text-sm text-muted-foreground">Select the type of session you want to practice.</p>

            <div className="mt-7 grid grid-cols-2 gap-4">
                {modes.map((mode) => (
                    <button
                        key={mode.id}
                        type="button"
                        onClick={() => setSelected(mode.id)}
                        className={`flex flex-col items-center gap-3 rounded-2xl border p-6 text-center transition-all duration-200 hover:-translate-y-0.5 ${
                            selected === mode.id
                                ? "border-brand-red bg-brand-red/[0.08] shadow-[0_0_0_1px_#aa4761]"
                                : "border-border bg-background/40 hover:border-brand-red/40"
                        }`}
                    >
                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-colors ${
                            selected === mode.id ? "bg-brand-red/15 text-brand-red" : "bg-muted text-muted-foreground"
                        }`}>
                            {mode.icon}
                        </div>
                        <div>
                            <p className="text-sm font-medium text-foreground">{mode.label}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">{mode.desc}</p>
                        </div>
                    </button>
                ))}
            </div>

            <button
                type="button"
                disabled={!selected}
                onClick={() => {
                    onSelectMode(selected);
                    navigate(selected === "interview" ? "interview-setup" : "presentation-setup");
                }}
                className="ev-btn-primary mt-5"
            >
                Start <ArrowRight size={14} />
            </button>
        </FlowPage>
    );
};

// ---------------------------------------------------------------------------
// Interview Setup Page
// ---------------------------------------------------------------------------
const InterviewSetupPage = ({ navigate, difficulty, setDifficulty }) => {
    const [cv, setCv] = useState(null);

    return (
        <FlowPage>
            <FlowHeader onBack={() => navigate("selectmode")} />

            <h1 className="font-serif text-4xl leading-none text-foreground">Set up your interview.</h1>
            <p className="mt-2 text-sm text-muted-foreground">Customize your session before you start.</p>

            <div className="mt-7">
                <p className="mb-3 text-sm font-medium text-foreground">Difficulty</p>
                <div className="flex gap-2">
                    {["easy", "medium", "hard"].map((d) => (
                        <button
                            key={d}
                            type="button"
                            onClick={() => setDifficulty(d)}
                            className={`rounded-full border px-5 py-2 text-sm capitalize transition-all ${
                                difficulty === d
                                    ? "border-brand-red bg-brand-red text-white"
                                    : "border-border text-muted-foreground hover:border-brand-red/40 hover:text-foreground"
                            }`}
                        >
                            {d.charAt(0).toUpperCase() + d.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            <div className="mt-6">
                <p className="mb-3 text-sm font-medium text-foreground">
                    CV Upload <span className="font-normal text-muted-foreground">(optional)</span>
                </p>
                <label className="flex h-[2.75rem] w-full cursor-pointer items-center gap-3 rounded-[0.875rem] border-[1.5px] border-dashed border-border bg-background/30 px-4 text-sm text-muted-foreground transition-colors hover:border-brand-red/40 hover:text-foreground">
                    <Upload size={15} />
                    <span className="truncate">{cv ? cv.name : "Upload .pdf or .docx"}</span>
                    <input
                        type="file"
                        accept=".pdf,.docx"
                        className="hidden"
                        onChange={(e) => setCv(e.target.files?.[0] ?? null)}
                    />
                </label>
            </div>

            <button
                type="button"
                onClick={() => navigate("session")}
                className="ev-btn-primary mt-5"
            >
                Start Interview <ArrowRight size={14} />
            </button>
        </FlowPage>
    );
};

// ---------------------------------------------------------------------------
// Presentation Setup Page
// ---------------------------------------------------------------------------
const PresentationSetupPage = ({ navigate }) => (
    <FlowPage>
        <FlowHeader onBack={() => navigate("selectmode")} />

        <h1 className="font-serif text-4xl leading-none text-foreground">Start your presentation.</h1>
        <p className="mt-2 text-sm text-muted-foreground">Prepped records and analyses your delivery in real time.</p>

        <div className="mt-7 rounded-2xl border border-border bg-background/40 p-5">
            <p className="mb-4 text-sm font-medium text-foreground">Before you start</p>
            <ul className="grid gap-3 text-sm text-muted-foreground">
                {[
                    "Find a quiet space with minimal background noise",
                    "Speak at your natural pace — avoid rushing",
                    "Structure your talk: intro, key points, conclusion",
                    "Prepped tracks pace, clarity, and confidence live",
                ].map((tip) => (
                    <li key={tip} className="flex items-start gap-3">
                        <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-brand-red" />
                        {tip}
                    </li>
                ))}
            </ul>
        </div>

        <button
            type="button"
            onClick={() => navigate("session")}
            className="ev-btn-primary mt-5"
        >
            Start Recording <ArrowRight size={14} />
        </button>
    </FlowPage>
);

// ---------------------------------------------------------------------------
// Session Page
// ---------------------------------------------------------------------------
const ALL_QUESTIONS = [
    "Tell me about yourself and your background.",
    "What is your greatest professional strength?",
    "Describe a challenge you faced and how you handled it.",
    "Where do you see yourself in 5 years?",
    "Why are you interested in this role?",
    "How do you handle working under pressure?",
    "Do you have any questions for us?",
];

const SessionPage = ({ navigate, mode, difficulty }) => {
    const [seconds, setSeconds] = useState(0);
    const [qIndex, setQIndex] = useState(0);
    const [streamReady, setStreamReady] = useState(false);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [camEnabled, setCamEnabled] = useState(true);
    const [micEnabled, setMicEnabled] = useState(true);
    const pulseRefs = useRef([]);
    const videoRef = useRef(null);
    const streamRef = useRef(null);

    const questions = mode === "interview"
        ? ALL_QUESTIONS.slice(0, difficulty === "easy" ? 3 : difficulty === "medium" ? 5 : 7)
        : [];
    const isLastQ = qIndex === questions.length - 1;

    // Camera + microphone
    useEffect(() => {
        let acquired;
        navigator.mediaDevices
            .getUserMedia({ video: true, audio: true })
            .then((stream) => {
                acquired = stream;
                streamRef.current = stream;
                if (videoRef.current) videoRef.current.srcObject = stream;
                setStreamReady(true);
            })
            .catch(() => setPermissionDenied(true));
        return () => {
            if (acquired) acquired.getTracks().forEach((t) => t.stop());
        };
    }, []);

    // Timer
    useEffect(() => {
        const id = setInterval(() => setSeconds((s) => s + 1), 1000);
        return () => clearInterval(id);
    }, []);

    // Pulse animation
    useEffect(() => {
        pulseRefs.current.forEach((el, i) => {
            if (!el) return;
            gsap.to(el, { scale: 1.25, opacity: 0, duration: 2.3, repeat: -1, ease: "power1.out", delay: i * 0.45 });
        });
    }, []);

    const toggleCam = () => {
        const track = streamRef.current?.getVideoTracks()[0];
        if (!track) return;
        track.enabled = !track.enabled;
        setCamEnabled(track.enabled);
    };

    const toggleMic = () => {
        const track = streamRef.current?.getAudioTracks()[0];
        if (!track) return;
        track.enabled = !track.enabled;
        setMicEnabled(track.enabled);
    };

    const fmt = (s) =>
        `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

    // Shows placeholder when cam is off, loading, or denied
    const showPlaceholder = !camEnabled || !streamReady;
    const placeholderLabel = !camEnabled ? "Camera off" : "Starting camera…";

    return (
        <div className="flex min-h-screen flex-col items-center bg-background px-4 py-8">
            {/* Header */}
            <div className="w-full max-w-130">
                <FlowHeader onBack={() => navigate(mode === "interview" ? "interview-setup" : "presentation-setup")} />
            </div>

            {/* ── TOP: Camera feed ── */}
            <div className="w-full max-w-120">
                <div className="relative aspect-video overflow-hidden rounded-4xl bg-[#1c1412]">
                    {/* Video element always in DOM so srcObject can be attached */}
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className="h-full w-full object-cover"
                        style={{ transform: "scaleX(-1)" }}
                    />
                    {/* Placeholder overlay */}
                    {showPlaceholder && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#1c1412]">
                            <CameraOff size={28} className="text-white/25" />
                            <p className="text-xs text-white/25">{placeholderLabel}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Toolbar: cam + mic toggles ── */}
            <div className="mt-4 flex items-center gap-3">
                <button
                    type="button"
                    onClick={toggleCam}
                    disabled={permissionDenied}
                    className={`flex h-10 w-10 items-center justify-center rounded-full transition-all disabled:opacity-40 ${
                        camEnabled
                            ? "bg-foreground text-background"
                            : "border border-border text-muted-foreground hover:border-brand-red/40"
                    }`}
                >
                    {camEnabled ? <Video size={16} /> : <VideoOff size={16} />}
                </button>
                <button
                    type="button"
                    onClick={toggleMic}
                    disabled={permissionDenied}
                    className={`flex h-10 w-10 items-center justify-center rounded-full transition-all disabled:opacity-40 ${
                        micEnabled
                            ? "bg-foreground text-background"
                            : "border border-border text-muted-foreground hover:border-brand-red/40"
                    }`}
                >
                    {micEnabled ? <Mic size={16} /> : <MicOff size={16} />}
                </button>
            </div>

            {/* Permission denied notice */}
            {permissionDenied && (
                <div className="mt-4 w-full max-w-120 rounded-2xl border border-border bg-background/40 px-5 py-4">
                    <div className="flex items-start gap-3">
                        <CameraOff size={15} className="mt-0.5 shrink-0 text-brand-red" />
                        <p className="text-sm text-muted-foreground">
                            Camera or microphone access was denied. Please allow access in your browser settings and refresh.
                        </p>
                    </div>
                </div>
            )}

            {/* ── BOTTOM: question card + pulse + timer + action ── */}
            <div className="mt-6 w-full max-w-130">
                {/* Question card — interview mode only */}
                {mode === "interview" && (
                    <div className="mb-6 rounded-2xl border border-border bg-background/40 p-5">
                        <div className="mb-3 flex items-center justify-between">
                            <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                                Question {qIndex + 1} of {questions.length}
                            </span>
                            <span className="flex h-5 items-center rounded-full border border-brand-red/20 bg-brand-red/10 px-2 text-[10px] font-medium capitalize text-brand-red">
                                {difficulty}
                            </span>
                        </div>
                        <div className="mb-4 h-1 w-full overflow-hidden rounded-full bg-border">
                            <div
                                className="h-full rounded-full bg-brand-red transition-all duration-300"
                                style={{ width: `${((qIndex + 1) / questions.length) * 100}%` }}
                            />
                        </div>
                        <p className="text-sm font-medium leading-relaxed text-foreground">
                            {questions[qIndex]}
                        </p>
                    </div>
                )}

                {/* Pulse rings + mic icon */}
                <div className="relative flex h-60 items-center justify-center">
                    {[150, 210, 270].map((size, i) => (
                        <div
                            key={i}
                            ref={(el) => (pulseRefs.current[i] = el)}
                            className="absolute rounded-full border border-border"
                            style={{ width: size, height: size }}
                        />
                    ))}
                    <div className="relative z-10 flex h-24 w-24 items-center justify-center rounded-4xl border border-brand-red/25 bg-card text-brand-red shadow-[0_0_50px_rgba(170,71,97,0.16)]">
                        <Mic size={36} />
                    </div>
                </div>

                <div className="mt-2 text-center">
                    <p className="font-mono text-4xl font-light tracking-[0.12em] text-foreground">
                        {fmt(seconds)}
                    </p>
                    <h2 className="mt-3 font-serif text-3xl leading-none text-foreground">Session in progress.</h2>
                    <p className="mt-2 text-sm text-muted-foreground">Speak clearly — Prepped is listening.</p>
                </div>

                {mode === "interview" ? (
                    isLastQ ? (
                        <button type="button" onClick={() => navigate("report")} className="ev-btn-primary mt-8 mb-8">
                            End Session <ArrowRight size={14} />
                        </button>
                    ) : (
                        <button type="button" onClick={() => setQIndex((i) => i + 1)} className="ev-btn-primary mt-8 mb-8">
                            Next Question <ArrowRight size={14} />
                        </button>
                    )
                ) : (
                    <button type="button" onClick={() => navigate("report")} className="ev-btn-primary mt-8 mb-8">
                        End Session <ArrowRight size={14} />
                    </button>
                )}
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------------
// Score circle helper (used in ReportPage)
// ---------------------------------------------------------------------------
const ScoreCircle = ({ score }) => {
    const r = 52;
    const circ = 2 * Math.PI * r;
    const dash = (score / 100) * circ;
    return (
        <div className="relative mx-auto flex h-36 w-36 items-center justify-center">
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r={r} fill="none" stroke="#c4a89e" strokeWidth="7" opacity="0.35" />
                <circle
                    cx="60" cy="60" r={r}
                    fill="none"
                    stroke="#aa4761"
                    strokeWidth="7"
                    strokeDasharray={`${dash} ${circ - dash}`}
                    strokeLinecap="round"
                />
            </svg>
            <div className="relative z-10 text-center">
                <p className="text-4xl font-light text-foreground">{score}</p>
                <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground">score</p>
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------------
// Report Page
// ---------------------------------------------------------------------------
const ReportPage = ({ navigate }) => {
    const [showHistory, setShowHistory] = useState(false);

    const feedback = [
        "Strong opening — clear and confident",
        "Reduce filler words (um, uh) between answers",
        "Slow down when explaining technical examples",
        "Use a stronger closing statement",
    ];

    const sessions = [
        { label: "Interview Practice", score: "86%", date: "Today" },
        { label: "Presentation Mode", score: "78%", date: "Yesterday" },
        { label: "Interview Practice", score: "71%", date: "2 days ago" },
        { label: "Mini Quiz", score: "Done", date: "3 days ago" },
    ];

    return (
        <div className={`flex min-h-screen flex-col items-center bg-background px-4 py-12 ${showHistory ? "" : "justify-center"}`}>
            <div className="flow-page-card w-full">
                <FlowHeader onBack={() => navigate("selectmode")} />

                <h1 className="font-serif text-4xl leading-none text-foreground">Your report is ready.</h1>
                <p className="mt-2 text-sm text-muted-foreground">Here's how your session went.</p>

                <div className="my-7">
                    <ScoreCircle score={84} />
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <MetricCard label="Confidence" value="84%" />
                    <MetricCard label="Clarity" value="91%" />
                    <MetricCard label="Pace" value="Good" />
                </div>

                <div className="mt-5 grid gap-2">
                    {feedback.map((item) => (
                        <div
                            key={item}
                            className="flex items-center gap-3 rounded-2xl border border-border bg-background/40 px-4 py-3 text-sm text-foreground"
                        >
                            <CheckCircle2 size={16} className="shrink-0 text-brand-red" />
                            <span>{item}</span>
                        </div>
                    ))}
                </div>

                <div className="mt-5 grid gap-3">
                    <button type="button" onClick={() => navigate("selectmode")} className="ev-btn-primary">
                        Practice Again <ArrowRight size={14} />
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowHistory((h) => !h)}
                        className="ev-btn-ghost"
                    >
                        {showHistory ? "Hide History" : "View History"}
                    </button>
                </div>
            </div>

            {showHistory && (
                <div className="mt-6 w-full" style={{ maxWidth: "520px" }}>
                    <div className="rounded-[2rem] border border-border bg-card p-6">
                        <h3 className="mb-5 font-serif text-2xl text-foreground">Session history</h3>
                        <div className="grid gap-3">
                            {sessions.map((s, i) => (
                                <div key={i} className="flex items-center justify-between rounded-2xl border border-border bg-background/40 px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-red/10 text-brand-red">
                                            <Clock3 size={15} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-foreground">{s.label}</p>
                                            <p className="text-xs text-muted-foreground">{s.date}</p>
                                        </div>
                                    </div>
                                    <p className="font-mono text-xs text-brand-red">{s.score}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ---------------------------------------------------------------------------
// Navbar  — hidden on all flow views
// ---------------------------------------------------------------------------
const Navbar = ({ onSignIn, onGoToHistory }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <nav className="fixed left-0 right-0 top-4 z-50 flex w-full justify-center px-4">
            <div className="navbar-critical">
                <a href="#home" className="shrink-0 font-serif text-2xl italic text-foreground transition-opacity hover:opacity-80">
                    Prepped.
                </a>

                <div className="hidden items-center gap-1 md:flex">
                    <button
                        type="button"
                        onClick={onGoToHistory}
                        className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm text-muted-foreground transition-all hover:-translate-y-0.5 hover:bg-brand-red/10 hover:text-foreground"
                    >
                        <HistoryIcon size={14} /> History
                    </button>
                    <a href="#settings" className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm text-muted-foreground transition-all hover:-translate-y-0.5 hover:bg-brand-red/10 hover:text-foreground">
                        <SettingsIcon size={14} /> Settings
                    </a>
                    <button
                        type="button"
                        onClick={onSignIn}
                        className="ml-1 flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-all hover:-translate-y-0.5 hover:opacity-90"
                    >
                        Sign in <ArrowRight size={14} />
                    </button>
                </div>

                <button type="button" className="text-foreground md:hidden" onClick={() => setIsOpen((p) => !p)} aria-label="Open navigation">
                    {isOpen ? <X /> : <Menu />}
                </button>
            </div>

            {isOpen && (
                <div className="absolute left-4 right-4 top-20 rounded-[1.5rem] border border-border bg-card p-4 shadow-2xl md:hidden">
                    <div className="grid gap-2">
                        <button onClick={() => { onSignIn(); setIsOpen(false); }} className="rounded-2xl border border-border bg-background/40 p-4 text-center font-serif text-xl text-foreground">
                            Sign in
                        </button>
                        <button onClick={() => { onGoToHistory(); setIsOpen(false); }} className="rounded-2xl border border-border bg-background/40 p-4 text-center font-serif text-xl text-foreground">
                            History
                        </button>
                        <a href="#settings" onClick={() => setIsOpen(false)} className="rounded-2xl border border-border bg-background/40 p-4 text-center font-serif text-xl text-foreground">
                            Settings
                        </a>
                    </div>
                </div>
            )}
        </nav>
    );
};

// ---------------------------------------------------------------------------
// SplitText
// ---------------------------------------------------------------------------
const SplitText = ({ children, className, delay = 0, blur = 24, scale = 1 }) => {
    const comp = useRef(null);
    const text = children.toString();

    useLayoutEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from(".char", {
                opacity: 0,
                filter: `blur(${blur}px)`,
                scale,
                y: 20,
                duration: 1.5,
                stagger: 0.04,
                ease: "power4.out",
                delay,
            });
        }, comp);
        return () => ctx.revert();
    }, [delay, blur, scale]);

    return (
        <span ref={comp} className={className} style={{ display: "inline-block" }}>
            {text.split(" ").map((word, i, arr) => (
                <span key={i} style={{ display: "inline-block", whiteSpace: "nowrap" }}>
                    {word.split("").map((char, j) => (
                        <span key={j} className="char inline-block" style={{ willChange: "transform, opacity, filter" }}>{char}</span>
                    ))}
                    {i < arr.length - 1 && <span className="char inline-block">&nbsp;</span>}
                </span>
            ))}
        </span>
    );
};

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------
const Hero = ({ onSignIn }) => {
    const containerRef = useRef(null);

    useLayoutEffect(() => {
        const ctx = gsap.context(() => {
            gsap.to(containerRef.current, { scale: 1, opacity: 1, duration: 1.5, ease: "power3.out" });
        }, containerRef);
        return () => ctx.revert();
    }, []);

    return (
        <section id="home" className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-background perspective-[1200px]">
            <div ref={containerRef} className="relative flex h-[95%] w-[95%] scale-90 items-center justify-center overflow-hidden rounded-[2rem] opacity-0" style={{ transformStyle: "preserve-3d" }}>
                <div className="absolute inset-0 z-0">
                    <LiquidHeroBackground />
                    <div className="absolute inset-0 bg-[#3a2422]/20" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#3a2422]/80 via-[#653d3b]/20 to-transparent" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(58,36,34,0.36)_75%)]" />
                </div>

                <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-4 text-center">
                    <div className="mb-6 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.25em] text-white/80 backdrop-blur-xl">
                        AI speaking coach
                    </div>

                    <h1 className="font-serif text-[3.4rem] font-light leading-[1] tracking-[-0.05em] text-white md:text-[5.5rem]">
                        <SplitText delay={0.2} blur={24}>Train Your Voice.</SplitText>
                        <br />
                        <SplitText delay={0.8} blur={24}>Own Every Interview</SplitText>
                        <SplitText delay={1.8} blur={24}> And Presentation</SplitText>
                    </h1>

                    <div className="mt-8 md:mt-12">
                        <p className="font-sans text-xl tracking-tight text-white/90 md:text-2xl">
                            <SplitText delay={1.5} blur={12} scale={0} className="font-normal">Prepped turns practice into confidence.</SplitText>
                            <SplitText delay={3.5} blur={12} scale={0} className="font-normal"> Speak, analyze, improve, repeat.</SplitText>
                        </p>
                    </div>

                    <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                        <button
                            type="button"
                            onClick={onSignIn}
                            className="rounded-full bg-white px-7 py-3 text-sm font-medium text-[#3a2422] transition-all hover:-translate-y-1 hover:bg-white/90"
                        >
                            Sign in
                        </button>
                        <a href="#analysis" className="rounded-full border border-white/25 bg-white/10 px-7 py-3 text-sm font-medium text-white backdrop-blur-xl transition-all hover:-translate-y-1 hover:bg-white/15">
                            See feedback
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
};

// ---------------------------------------------------------------------------
// Marquee
// ---------------------------------------------------------------------------
const Marquee = () => {
    const marqueeRef = useRef(null);
    const textRef = useRef(null);

    useEffect(() => {
        const wrapper = marqueeRef.current;
        const textElement = textRef.current;
        if (!wrapper || !textElement) return;
        const clone = textElement.cloneNode(true);
        wrapper.appendChild(clone);
        const totalWidth = textElement.offsetWidth;
        const tween = gsap.to([textElement, clone], {
            x: -totalWidth, duration: 30, repeat: -1, ease: "none",
            modifiers: { x: gsap.utils.unitize((x) => parseFloat(x) % totalWidth) },
        });
        return () => { tween.kill(); clone.remove(); };
    }, []);

    return (
        <div className="flex w-full items-center overflow-hidden bg-background py-24">
            <div ref={marqueeRef} className="flex gap-16 whitespace-nowrap">
                <div ref={textRef} className="flex select-none gap-16 pr-16">
                    {["PRACTICE", "PRESENT", "IMPROVE"].map((word) => (
                        <span key={word} className="font-serif text-[10vw] italic leading-none text-foreground/20">{word}</span>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------------
// ThreePillars
// ---------------------------------------------------------------------------
const ThreePillars = () => {
    const sectionRef = useRef(null);
    const titleRef = useRef(null);
    const containerRef = useRef(null);
    const cardsRef = useRef([]);

    useLayoutEffect(() => {
        const ctx = gsap.context(() => {
            gsap.set(containerRef.current, { y: "70vh", gap: 0 });
            gsap.set(titleRef.current, { y: 50, scale: 1.5, opacity: 0 });
            if (cardsRef.current[0]) gsap.set(cardsRef.current[0], { borderRadius: "1rem 0 0 1rem" });
            if (cardsRef.current[1]) gsap.set(cardsRef.current[1], { borderRadius: "0" });
            if (cardsRef.current[2]) gsap.set(cardsRef.current[2], { borderRadius: "0 1rem 1rem 0" });
            gsap.set(cardsRef.current, { transformPerspective: 1000, transformStyle: "preserve-3d" });

            const mm = gsap.matchMedia();
            mm.add("(min-width: 768px)", () => {
                const tl = gsap.timeline({
                    scrollTrigger: { trigger: sectionRef.current, start: "top top", end: "+=3500", scrub: 1, pin: true, anticipatePin: 1 },
                });
                tl.to(titleRef.current, { y: 0, scale: 1, opacity: 1, duration: 1.2, ease: "power3.out" });
                tl.to(containerRef.current, { y: "0%", duration: 1.5, ease: "power3.out" }, "-=0.8");
                tl.to(containerRef.current, { gap: "2rem", duration: 1.5, ease: "power2.inOut" });
                tl.to(cardsRef.current, { borderRadius: "1rem", duration: 1.5, ease: "power2.inOut" }, "<");
                tl.to(cardsRef.current, { rotateY: 180, duration: 3, stagger: { each: 0.1, from: "center" }, ease: "elastic.out(1, 0.8)" });
                tl.to(cardsRef.current[0], { y: 30, rotateZ: -5, duration: 3, ease: "power2.out" }, "<");
                tl.to(cardsRef.current[2], { y: 30, rotateZ: 5, duration: 3, ease: "power2.out" }, "<");
            });
            mm.add("(max-width: 767px)", () => {
                gsap.set(titleRef.current, { y: 0, opacity: 1, scale: 1 });
                gsap.set(containerRef.current, { flexDirection: "column", height: "auto", y: 0, gap: "1.5rem", marginBottom: "4rem" });
                gsap.set(cardsRef.current, { rotateY: 0, borderRadius: "1rem", width: "100%", height: "auto", minHeight: "500px", y: 0, rotateZ: 0 });
                gsap.set(sectionRef.current, { height: "auto", minHeight: "100vh", paddingBottom: "4rem" });
            });
        }, sectionRef);
        return () => ctx.revert();
    }, []);

    const pillars = [
        { id: 1, number: "01", title: "Interview Practice", color: "#e9e4db", textColor: "#3a2422", desc: "Train with realistic AI interview questions." },
        { id: 2, number: "02", title: "Presentation Mode", color: "#aa4761", textColor: "#e9e4db", desc: "Record your delivery and improve your speaking flow." },
        { id: 3, number: "03", title: "Smart Feedback", color: "#653d3b", textColor: "#e9e4db", desc: "Get clear insights on confidence, clarity, and performance." },
    ];

    return (
        <section ref={sectionRef} className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-background py-10 perspective-[2000px]">
            <div className="z-20 mb-8 flex h-[20vh] items-end justify-center px-4">
                <div ref={titleRef} className="w-full text-center">
                    <h2 className="font-serif text-5xl font-light leading-none tracking-tight text-foreground md:text-7xl">Prepped's Practice Core</h2>
                    <p className="mt-4 font-sans text-sm uppercase tracking-wide text-muted-foreground md:text-base">Interview confidence, presentation clarity, and real feedback</p>
                </div>
            </div>

            <div ref={containerRef} className="z-10 flex h-auto w-full max-w-7xl flex-col items-stretch justify-center px-4 md:h-[60vh] md:flex-row md:px-0" style={{ perspective: "2000px", transformStyle: "preserve-3d" }}>
                {pillars.map((pillar, index) => (
                    <div key={pillar.id} ref={(el) => (cardsRef.current[index] = el)} className="relative h-auto min-h-[500px] w-full flex-none md:h-full md:min-h-0 md:w-[33.333%]" style={{ transformStyle: "preserve-3d" }}>
                        <div className="absolute inset-0 hidden overflow-hidden bg-muted md:block" style={{ backfaceVisibility: "hidden", borderRadius: "inherit" }}>
                            <img
                                src="https://images.unsplash.com/photo-1551836022-d5d88e9218df?q=80&w=2400&auto=format&fit=crop"
                                alt="Prepped practice"
                                className="pointer-events-none absolute top-0 h-full object-cover"
                                style={{ width: "300%", left: index === 0 ? "0%" : index === 1 ? "-100%" : "-200%", maxWidth: "none" }}
                            />
                            <div className="absolute inset-0 bg-[#653d3b]/50" />
                            <div className="absolute inset-0 bg-gradient-to-br from-[#aa4761]/20 to-[#3a2422]/40" />
                        </div>

                        <style dangerouslySetInnerHTML={{ __html: `@media (min-width: 768px) { .pillar-back-${pillar.id} { transform: rotateY(180deg); } }` }} />

                        <div className={`relative inset-0 flex h-full min-h-[500px] flex-col justify-between border border-white/5 p-8 md:absolute md:min-h-0 md:p-10 pillar-back-${pillar.id}`} style={{ backfaceVisibility: "hidden", borderRadius: "inherit", backgroundColor: pillar.color, color: pillar.textColor }}>
                            <div className="flex items-start justify-between border-b border-current/20 pb-4">
                                <span className="font-mono text-xl font-medium">{pillar.number}</span>
                                <div className="h-2 w-2 rounded-full bg-current opacity-50" />
                            </div>
                            <div className="space-y-5">
                                <h3 className="font-serif text-3xl leading-[0.9] tracking-tight md:text-4xl">
                                    {pillar.title.split(" ").map((word, i) => <span key={i} className="block">{word}</span>)}
                                </h3>
                                <p className="max-w-xs text-sm leading-relaxed opacity-75">{pillar.desc}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

// ---------------------------------------------------------------------------
// BentoGrid
// ---------------------------------------------------------------------------
const BentoGrid = ({ onSignIn }) => {
    const [graphData, setGraphData] = useState(Array(12).fill(78).map((_, i) => 78 + Math.sin(i) * 7));
    const [confidence, setConfidence] = useState(84);
    const [activeMode, setActiveMode] = useState("Interview");

    const graphPathRef = useRef(null);
    const fillPathRef = useRef(null);
    const barsRef = useRef([]);
    const pulseRefs = useRef([]);

    const getControlPoint = (current, previous, next, reverse) => {
        const p = previous || current; const n = next || current;
        const smoothing = 0.2;
        const o = { x: p[0] - n[0], y: p[1] - n[1] };
        const angle = Math.atan2(o.y, o.x) + (reverse ? Math.PI : 0);
        const length = Math.sqrt(Math.pow(o.x, 2) + Math.pow(o.y, 2)) * smoothing;
        return [current[0] + Math.cos(angle) * length, current[1] + Math.sin(angle) * length];
    };

    const getSmoothPath = (points, width, height) => {
        if (!points || points.length === 0) return "";
        const max = Math.max(...points, 1); const min = Math.min(...points, 0); const range = max - min || 1;
        const data = points.map((val, i) => {
            const x = (i / (points.length - 1)) * width;
            const y = height - ((val - min) / range * (height * 0.8) + height * 0.1);
            return [x, y];
        });
        return data.reduce((acc, point, i, arr) => {
            if (i === 0) return `M ${point[0]},${point[1]}`;
            const cp1 = getControlPoint(arr[i - 1], arr[i - 2], point);
            const cp2 = getControlPoint(point, arr[i - 1], arr[i + 1], true);
            return `${acc} C ${cp1[0]},${cp1[1]} ${cp2[0]},${cp2[1]} ${point[0]},${point[1]}`;
        }, "");
    };

    useEffect(() => {
        const interval = setInterval(() => {
            setGraphData((prev) => {
                const last = prev[prev.length - 1];
                const flow = Math.sin(Date.now() / 1000) * 5;
                let next = last + (Math.random() - 0.5) * 6 * 0.5 + flow * 0.2;
                return [...prev.slice(1), Math.max(55, Math.min(97, next))];
            });
            setConfidence((v) => Math.max(68, Math.min(96, v + (Math.random() - 0.48) * 2)));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!graphPathRef.current) return;
        const newD = getSmoothPath(graphData, 100, 20);
        gsap.to(graphPathRef.current, { attr: { d: newD }, duration: 0.8, ease: "power2.out" });
        if (fillPathRef.current) gsap.to(fillPathRef.current, { attr: { d: `${newD} V 20 H 0 Z` }, duration: 0.8, ease: "power2.out" });
    }, [graphData]);

    const [time, setTime] = useState(0);
    useEffect(() => {
        let frame;
        const animate = () => { setTime((t) => t + 0.05); frame = requestAnimationFrame(animate); };
        frame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frame);
    }, []);

    useEffect(() => {
        barsRef.current.forEach((bar, i) => {
            if (!bar) return;
            const h = Math.max(16, Math.min(92, 42 + Math.sin(time + i * 0.6) * 24 + Math.sin(time * 0.5 + i) * 9));
            gsap.to(bar, { height: `${h}%`, duration: 0.5, ease: "power1.out" });
        });
    }, [time]);

    useEffect(() => {
        pulseRefs.current.forEach((el, i) => {
            if (!el) return;
            gsap.to(el, { scale: 1.25, opacity: 0, duration: 2.3, repeat: -1, ease: "power1.out", delay: i * 0.45 });
        });
    }, []);

    const miniStats = [
        { label: "Confidence", value: `${Math.round(confidence)}%` },
        { label: "Clarity", value: "91%" },
        { label: "Pace", value: "Good" },
    ];

    const cardBase = "flow-anchor group relative overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-[0_24px_70px_rgba(58,36,34,0.08)] transition-all duration-300 hover:-translate-y-1 hover:border-brand-red/40 hover:shadow-[0_30px_90px_rgba(58,36,34,0.13)]";

    return (
        <section className="bg-background px-6 py-32 md:px-12" id="dashboard">
            <div className="mx-auto max-w-6xl">
                <div className="mb-20">
                    <span className="mb-4 inline-flex text-[11px] font-semibold uppercase tracking-[0.25em] text-brand-red">Prepped Flow</span>
                    <h2 className="mb-6 font-serif text-5xl leading-none tracking-tight text-foreground md:text-6xl">A smoother way to practice speaking.</h2>
                    <p className="max-w-2xl text-lg font-light text-muted-foreground md:text-xl">Sign in and start your first session — Prepped guides you through every step.</p>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-6">
                    {/* Main dashboard card */}
                    <div className={`${cardBase} min-h-[540px] md:col-span-4`} id="dashboard-main">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(170,71,97,0.16),transparent_42%)]" />
                        <div className="relative z-10 flex h-full flex-col">
                            <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                                <div>
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-red">Dashboard</span>
                                    <h3 className="mt-3 font-serif text-5xl leading-[0.92] tracking-[-0.04em] text-foreground md:text-6xl">Practice cockpit.</h3>
                                    <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">Continue training, check performance, and jump into the next interview or presentation simulation.</p>
                                </div>
                                <div className="flex h-28 w-28 shrink-0 flex-col items-center justify-center rounded-full border border-brand-red/25 bg-brand-red/10 text-center">
                                    <span className="text-4xl font-light text-foreground">{Math.round(confidence)}</span>
                                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">score</span>
                                </div>
                            </div>

                            <div className="rounded-[1.6rem] border border-border bg-background/35 p-5 backdrop-blur-md">
                                <div className="mb-8 flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Today's session</p>
                                        <h4 className="mt-1 text-xl font-medium text-foreground">{activeMode} Training</h4>
                                    </div>
                                    <span className="flex items-center gap-1 rounded-full border border-brand-red/20 bg-brand-red/10 px-3 py-1 text-xs font-medium text-brand-red">
                                        <TrendingUp size={13} /> Live
                                    </span>
                                </div>
                                <div className="my-8 h-24 w-full">
                                    <svg className="h-full w-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 20">
                                        <path ref={graphPathRef} d="M0,10 L100,10" fill="none" stroke="var(--brand-red)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                                        <path ref={fillPathRef} d="M0,10 L100,10 V20 H0 Z" fill="url(#prepped-chart-fill)" stroke="none" opacity="0.25" />
                                        <defs>
                                            <linearGradient id="prepped-chart-fill" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="var(--brand-red)" stopOpacity="0.6" />
                                                <stop offset="100%" stopColor="var(--brand-red)" stopOpacity="0" />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    {miniStats.map((stat) => <MetricCard key={stat.label} label={stat.label} value={stat.value} />)}
                                </div>
                            </div>

                            <div className="mt-6 grid grid-cols-2 gap-3">
                                {[
                                    { icon: <Mic size={17} />, label: "Record", href: "#recording" },
                                    { icon: <FileText size={17} />, label: "Report", href: "#report" },
                                ].map((item) => (
                                    <a key={item.label} href={item.href} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-brand-red/15 bg-brand-red/10 text-sm text-foreground transition-all hover:-translate-y-0.5 hover:bg-foreground hover:text-background">
                                        {item.icon} <span>{item.label}</span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Sign-in card */}
                    <div id="login" className={`${cardBase} md:col-span-2`}>
                        <div className="relative z-10">
                            <div className="mb-6 flex items-center justify-between">
                                <SoftIcon><LogIn size={20} /></SoftIcon>
                                <StepBadge>01</StepBadge>
                            </div>
                            <h3 className="font-serif text-4xl leading-none text-foreground">Sign in</h3>
                            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                                A clean entry point to continue your saved practice journey.
                            </p>
                            <input
                                type="email"
                                readOnly
                                placeholder="student@email.com"
                                onClick={onSignIn}
                                onFocus={onSignIn}
                                className="mt-6 h-11 w-full cursor-pointer rounded-2xl border border-border bg-background/40 px-4 text-sm text-muted-foreground focus:outline-none"
                            />
                            <button
                                type="button"
                                onClick={onSignIn}
                                className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-foreground text-sm font-medium text-background transition-all hover:opacity-90"
                            >
                                Enter dashboard <ArrowRight size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Recording card — full width */}
                    <div id="recording" className={`${cardBase} min-h-[430px] text-center md:col-span-6`}>
                        <div className="relative z-10 flex h-full flex-col items-center justify-center">
                            <div className="relative mb-10 flex items-center justify-center">
                                {[160, 230, 300].map((size, i) => (
                                    <div key={i} ref={(el) => (pulseRefs.current[i] = el)} className="absolute rounded-full border border-border" style={{ width: size, height: size }} />
                                ))}
                                <div className="relative z-10 flex h-28 w-28 items-center justify-center rounded-[2rem] border border-brand-red/25 bg-card text-brand-red shadow-[0_0_50px_rgba(170,71,97,0.16)]">
                                    <Mic size={42} />
                                </div>
                            </div>
                            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-red">Recording</span>
                            <h3 className="mt-3 font-serif text-5xl leading-none tracking-tight text-foreground">Speak. Prepped listens.</h3>
                            <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">Record an answer or presentation — Prepped analyses confidence, clarity, pace, and content.</p>
                        </div>
                    </div>

                    {/* Analysis */}
                    <div id="analysis" className={`${cardBase} min-h-[360px] md:col-span-2`}>
                        <div className="relative z-10 flex h-full flex-col">
                            <div className="mb-8 flex items-start justify-between">
                                <div>
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-red">Feedback</span>
                                    <h3 className="mt-3 font-serif text-4xl leading-none text-foreground">Live analysis</h3>
                                </div>
                                <BarChart3 size={22} className="text-brand-red" />
                            </div>
                            <div className="mb-6 flex flex-1 items-end justify-between gap-3">
                                {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                                    <div key={i} className="flex h-full flex-1 items-end">
                                        <div ref={(el) => (barsRef.current[i] = el)} className="min-h-4 w-full rounded-t-full bg-gradient-to-t from-brand-red to-brand-red/20" style={{ height: "20%" }} />
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {miniStats.map((stat) => <MetricCard key={stat.label} label={stat.label} value={stat.value} />)}
                            </div>
                        </div>
                    </div>

                    {/* Report */}
                    <div id="report" className={`${cardBase} min-h-[360px] md:col-span-2`}>
                        <div className="relative z-10">
                            <div className="mb-8 flex items-start justify-between">
                                <div>
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-red">Report</span>
                                    <h3 className="mt-3 font-serif text-4xl leading-none text-foreground">Clear next steps</h3>
                                </div>
                                <FileText size={22} className="text-brand-red" />
                            </div>
                            <div className="grid gap-3">
                                {["Strong opening answer", "Reduce filler words", "Slow down while explaining examples", "Use a stronger closing sentence"].map((item) => (
                                    <div key={item} className="flex items-center gap-3 rounded-2xl border border-border bg-background/35 p-3 text-sm text-foreground">
                                        <CheckCircle2 size={16} className="shrink-0 text-brand-red" />
                                        <span>{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* History */}
                    <div id="history" className={`${cardBase} min-h-[360px] md:col-span-2`}>
                        <div className="relative z-10">
                            <div className="mb-8 flex items-start justify-between">
                                <div>
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-red">History</span>
                                    <h3 className="mt-3 font-serif text-4xl leading-none text-foreground">Progress saved</h3>
                                </div>
                                <HistoryIcon size={22} className="text-brand-red" />
                            </div>
                            <div className="mb-4 grid gap-3">
                                {[["Interview Practice", "86%", "Today"], ["Presentation Mode", "78%", "Yesterday"], ["Mini Quiz", "Done", "2 days ago"]].map(([title, score, date]) => (
                                    <div key={title} className="flex items-center justify-between rounded-2xl border border-border bg-background/35 p-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-red/10 text-brand-red"><Clock3 size={15} /></div>
                                            <div>
                                                <p className="text-sm font-medium text-foreground">{title}</p>
                                                <p className="text-xs text-muted-foreground">{date}</p>
                                            </div>
                                        </div>
                                        <p className="font-mono text-xs text-brand-red">{score}</p>
                                    </div>
                                ))}
                            </div>
                            <a href="#settings" className="inline-flex items-center gap-2 rounded-full border border-brand-red/15 bg-brand-red/10 px-4 py-2 text-sm text-foreground transition-all hover:bg-foreground hover:text-background">
                                <SlidersHorizontal size={15} /> Open practice settings
                            </a>
                        </div>
                    </div>

                    {/* Settings */}
                    <div id="settings" className={`${cardBase} min-h-[240px] md:col-span-6`}>
                        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                            <div>
                                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-red">Settings</span>
                                <h3 className="mt-3 font-serif text-4xl leading-none text-foreground">Personalize the practice experience.</h3>
                                <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">Adjust practice language, feedback depth, mode difficulty, and saved progress preferences.</p>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                                {["Language", "Difficulty", "Feedback depth", "Saved history"].map((item) => (
                                    <div key={item} className="rounded-2xl border border-border bg-background/35 px-4 py-3 text-sm text-foreground">
                                        <div className="flex items-center gap-2"><SettingsIcon size={15} className="text-brand-red" />{item}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

// ---------------------------------------------------------------------------
// Testimonials
// ---------------------------------------------------------------------------
const Testimonials = () => {
    const containerRef = useRef(null);
    const testimonials = [
        { name: "Sara Khaled", role: "Computer Science Student", text: "Prepped made interview practice feel realistic. The feedback helped me notice mistakes I never paid attention to before." },
        { name: "Omar Naser", role: "Fresh Graduate", text: "The report was simple and useful. I knew exactly what to improve before my next presentation." },
        { name: "Lina Haddad", role: "Business Student", text: "I liked switching between interview mode and presentation mode. It felt like a complete speaking coach." },
        { name: "Yazan Saleh", role: "Job Seeker", text: "The confidence score and history section helped me see real progress after every practice session." },
    ];

    useLayoutEffect(() => {
        let animation;
        const ctx = gsap.context(() => {
            const lists = containerRef.current.querySelectorAll(".testimonial-list");
            animation = gsap.to(lists, { xPercent: -100, duration: 40, ease: "none", repeat: -1 });
        }, containerRef);
        const scroller = containerRef.current;
        const onEnter = () => animation && animation.timeScale(0);
        const onLeave = () => animation && animation.timeScale(1);
        scroller.addEventListener("mouseenter", onEnter);
        scroller.addEventListener("mouseleave", onLeave);
        return () => { ctx.revert(); scroller.removeEventListener("mouseenter", onEnter); scroller.removeEventListener("mouseleave", onLeave); };
    }, []);

    return (
        <section className="overflow-hidden bg-background py-32" id="testimonials">
            <div className="mx-auto mb-20 max-w-6xl px-6 md:px-0">
                <h2 className="font-serif text-5xl text-foreground md:text-6xl">Student Reactions.</h2>
                <p className="mt-4 text-lg text-muted-foreground">Built for people who want to speak better.</p>
            </div>
            <div className="w-full overflow-hidden">
                <div ref={containerRef} className="flex w-max">
                    {[0, 1].map((i) => (
                        <div key={i} className="testimonial-list flex gap-8 pr-8">
                            {testimonials.map((t, index) => (
                                <div key={index} className="group flex w-[300px] cursor-default flex-col justify-between rounded-2xl border border-border bg-muted/50 p-6 transition-all duration-300 hover:border-brand-red hover:bg-muted/80 md:w-[450px] md:p-12">
                                    <div className="relative mb-8">
                                        <span className="absolute -left-2 -top-4 font-serif text-6xl text-brand-red/20">"</span>
                                        <p className="relative z-10 font-sans text-lg leading-relaxed text-foreground/80 md:text-xl">{t.text}</p>
                                    </div>
                                    <div className="flex items-center gap-4 border-t border-border pt-6">
                                        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-border bg-background text-muted-foreground">
                                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${t.name.replace(" ", "")}`} alt={t.name} className="h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100" />
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-foreground transition-colors group-hover:text-brand-red">{t.name}</h4>
                                            <p className="text-sm text-foreground/40">{t.role}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------
const Services = () => {
    const services = [
        { id: 1, title: "AI Interview Questions", desc: "Generate realistic questions based on the student's goal and level." },
        { id: 2, title: "Presentation Practice Mode", desc: "Practice delivery, timing, clarity, and confidence before presenting." },
        { id: 3, title: "Real-Time Feedback", desc: "Analyze speaking pace, filler words, structure, and answer strength." },
        { id: 4, title: "Progress Tracking", desc: "Save reports and show improvement across repeated practice sessions." },
    ];

    return (
        <section className="bg-background px-6 py-32 md:px-12" id="capabilities">
            <div className="mx-auto max-w-6xl">
                <h2 className="mb-24 font-serif text-5xl text-foreground opacity-90 md:text-6xl">Prepped Capabilities.</h2>
                <div className="grid grid-cols-1 gap-x-12 gap-y-24 md:grid-cols-2">
                    {services.map((service, index) => (
                        <div key={service.id} className="group cursor-pointer border-t border-white/20 pt-8 transition-colors duration-500 hover:border-brand-red">
                            <div className="mb-4 flex items-start justify-between">
                                <span className="font-mono text-sm text-foreground/40">0{index + 1}</span>
                                <ArrowUpRight className="text-foreground/0 transition-all duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-brand-red" size={24} />
                            </div>
                            <h3 className="mb-4 font-serif text-3xl text-foreground transition-transform duration-300 group-hover:translate-x-2 md:text-4xl">{service.title}</h3>
                            <p className="max-w-sm font-sans text-foreground/60 transition-transform delay-75 duration-300 group-hover:translate-x-2">{service.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------
const Footer = ({ onSignIn }) => {
    const containerRef = useRef(null);
    const imageRef = useRef(null);
    const contentRef = useRef(null);

    useLayoutEffect(() => {
        const ctx = gsap.context(() => {
            gsap.to(imageRef.current, {
                y: "20%", ease: "none",
                scrollTrigger: { trigger: containerRef.current, start: "top bottom", end: "bottom top", scrub: true },
            });
            gsap.from(contentRef.current.children, {
                y: 50, opacity: 0, duration: 1.5, stagger: 0.1, ease: "power3.out",
                scrollTrigger: { trigger: containerRef.current, start: "top 70%" },
            });
        }, containerRef);
        return () => ctx.revert();
    }, []);

    return (
        <footer className="relative flex h-auto w-full items-center justify-center bg-background p-4 md:h-screen">
            <div ref={containerRef} className="relative flex h-full min-h-[600px] w-full flex-col justify-between gap-12 overflow-hidden rounded-[2rem] border border-white/10 p-6 md:max-h-[96vh] md:min-h-0 md:gap-0 md:p-12">
                <div className="absolute inset-0 z-0">
                    <img ref={imageRef} src="https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=2400&auto=format&fit=crop" alt="Prepped final section" className="-mt-[10%] h-[120%] w-full object-cover object-center" />
                    <div className="absolute inset-0 bg-[#653d3b]/40 mix-blend-multiply" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#3a1a18]/90 via-[#653d3b]/20 to-transparent" />
                    <div className="absolute inset-0 bg-black/10" />
                </div>

                <div className="relative z-10 flex w-full flex-1 flex-col items-center justify-center">
                    <div ref={contentRef} className="space-y-8 text-center">
                        <p className="font-sans text-lg tracking-wide text-white/80 md:text-xl">Every confident speaker starts with one practice session</p>
                        <h2 className="font-serif text-5xl leading-[0.9] tracking-tight text-white md:text-8xl lg:text-9xl">
                            Start <span className="font-light italic">speaking</span><br />better
                        </h2>
                        <div className="pt-8">
                            <button
                                type="button"
                                onClick={onSignIn}
                                className="inline-flex items-center justify-center rounded-full bg-white px-8 py-4 text-lg font-medium text-black transition-all duration-300 hover:scale-105 hover:bg-gray-200 active:scale-95"
                            >
                                Sign in to Prepped
                            </button>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 mt-12 flex w-full flex-col items-center justify-between gap-6 border-t border-white/10 pt-8 font-sans text-sm text-white/50 md:flex-row md:gap-0">
                    <p>© 2026 Prepped | All Rights Reserved.</p>
                    <a href="#analysis" className="transition-colors hover:text-white">Feedback</a>
                    <div className="flex gap-8">
                        <button type="button" onClick={onSignIn} className="transition-colors hover:text-white">Sign in</button>
                        <a href="#recording" className="transition-colors hover:text-white">Practice</a>
                        <a href="#report" className="transition-colors hover:text-white">Report</a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

// ---------------------------------------------------------------------------
// App — useState router
// ---------------------------------------------------------------------------
const App = () => {
    const [view, setView] = useState("landing");
    const [sessionMode, setSessionMode] = useState("interview");
    const [sessionDifficulty, setSessionDifficulty] = useState("medium");

    useEffect(() => {
        const lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            direction: "vertical",
            smooth: true,
        });
        function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
        requestAnimationFrame(raf);
        return () => lenis.destroy();
    }, []);

    const navigate = (v) => {
        setView(v);
        window.scrollTo(0, 0);
    };

    const goToSignIn = () => navigate("signin");

    const goToHistory = () => {
        if (view !== "landing") {
            setView("landing");
            setTimeout(() => document.getElementById("history")?.scrollIntoView({ behavior: "smooth" }), 120);
        } else {
            document.getElementById("history")?.scrollIntoView({ behavior: "smooth" });
        }
    };

    if (view === "signin")               return <SignInPage           navigate={navigate} />;
    if (view === "signup")               return <SignUpPage           navigate={navigate} />;
    if (view === "quiz")                 return <QuizPage             navigate={navigate} />;
    if (view === "selectmode")           return <SelectModePage        navigate={navigate} onSelectMode={setSessionMode} />;
    if (view === "interview-setup")      return <InterviewSetupPage    navigate={navigate} difficulty={sessionDifficulty} setDifficulty={setSessionDifficulty} />;
    if (view === "presentation-setup")   return <PresentationSetupPage navigate={navigate} />;
    if (view === "session")              return <SessionPage           navigate={navigate} mode={sessionMode} difficulty={sessionDifficulty} />;
    if (view === "report")               return <ReportPage           navigate={navigate} />;

    // Landing
    return (
        <div className="relative overflow-x-hidden bg-background text-foreground antialiased selection:bg-brand-red selection:text-white">
            <Navbar onSignIn={goToSignIn} onGoToHistory={goToHistory} />

            <main>
                <Hero onSignIn={goToSignIn} />
                <Marquee />
                <ThreePillars />
                <BentoGrid onSignIn={goToSignIn} />
                <Testimonials />
                <Services />
            </main>

            <Footer onSignIn={goToSignIn} />
        </div>
    );
};

export default App;
