import React, { useState, useEffect, useRef, useLayoutEffect, useMemo } from "react";
import {
    ArrowRight,
    Menu,
    X,
    ArrowUpRight,
    LogIn,
    Brain,
    Sparkles,
    Mic,
    BarChart3,
    FileText,
    History as HistoryIcon,
    Settings as SettingsIcon,
    Presentation,
    Briefcase,
    CheckCircle2,
    Clock3,
    SlidersHorizontal,
    TrendingUp,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";

gsap.registerPlugin(ScrollTrigger);

const MetricCard = ({ label, value }) => (
    <div className="rounded-2xl border border-border/70 bg-background/35 px-4 py-3 backdrop-blur-md">
        <p className="mb-1 text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
            {label}
        </p>
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

// ---------------------------------------------------------------------------
// Liquid Evanora Background
// ---------------------------------------------------------------------------
const liquidVertexShader = `
    varying vec2 vUv;

    void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
    }
`;

const liquidFragmentShader = `
    uniform float uTime;
    uniform vec2 uResolution;
    uniform vec2 uMouse;
    uniform float uHover;

    varying vec2 vUv;

    vec3 permute(vec3 x) {
        return mod(((x * 34.0) + 1.0) * x, 289.0);
    }

    float snoise(vec2 v) {
        const vec4 C = vec4(
            0.211324865405187,
            0.366025403784439,
            -0.577350269189626,
            0.024390243902439
        );

        vec2 i = floor(v + dot(v, C.yy));
        vec2 x0 = v - i + dot(i, C.xx);

        vec2 i1;
        i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);

        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;

        i = mod(i, 289.0);

        vec3 p = permute(
            permute(i.y + vec3(0.0, i1.y, 1.0))
            + i.x + vec3(0.0, i1.x, 1.0)
        );

        vec3 m = max(
            0.5 - vec3(
                dot(x0, x0),
                dot(x12.xy, x12.xy),
                dot(x12.zw, x12.zw)
            ),
            0.0
        );

        m = m * m;
        m = m * m;

        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;

        m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);

        vec3 g;
        g.x = a0.x * x0.x + h.x * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;

        return 130.0 * dot(m, g);
    }

    void main() {
        vec2 uv = vUv;
        float aspect = uResolution.x / uResolution.y;

        vec2 p = uv - 0.5;
        p.x *= aspect;

        vec2 mouse = uMouse - 0.5;
        mouse.x *= aspect;

        float mouseDist = distance(p, mouse);
        float mouseForce = smoothstep(0.62, 0.0, mouseDist) * uHover;
        float ripple = sin(mouseDist * 42.0 - uTime * 6.0) * 0.5 + 0.5;

        vec2 direction = normalize(p - mouse + vec2(0.0001));
        p += direction * mouseForce * 0.33;

        float t = uTime * 0.18;

        vec2 q = vec2(
            snoise(p * 1.7 + vec2(0.0, t)),
            snoise(p * 1.7 + vec2(4.8, 1.9) + t)
        );

        vec2 r = vec2(
            snoise(p * 2.2 + q * 1.8 + vec2(1.7, 9.2) + t * 0.7),
            snoise(p * 2.2 + q * 1.8 + vec2(8.3, 2.8) + t * 0.55)
        );

        float f = snoise(p * 2.1 + r * 2.45 + mouseForce * 0.8);

        vec3 deep = vec3(0.227, 0.141, 0.133);
        vec3 rose = vec3(0.667, 0.278, 0.380);
        vec3 blush = vec3(0.812, 0.694, 0.694);
        vec3 cream = vec3(0.914, 0.894, 0.859);

        float roseMix = smoothstep(-0.85, 0.85, f);
        float blushMix = smoothstep(0.05, 1.05, length(q));
        float shine = pow(abs(snoise(p * 5.4 + r + t)), 7.0);

        vec3 color = mix(deep, rose, roseMix);
        color = mix(color, blush, blushMix * 0.55);
        color += cream * shine * 0.22;

        color += rose * mouseForce * ripple * 0.25;
        color += cream * mouseForce * 0.12;

        float vignette = smoothstep(0.92, 0.18, distance(uv, vec2(0.5)));
        color *= vignette;

        color = color * 0.94 + 0.035;

        gl_FragColor = vec4(color, 1.0);
    }
`;

const LiquidEvanoraPlane = () => {
    const meshRef = useRef(null);
    const { size, gl } = useThree();

    const targetMouse = useRef(new THREE.Vector2(0.5, 0.5));
    const targetHover = useRef(0);

    const uniforms = useMemo(
        () => ({
            uTime: { value: 0 },
            uResolution: { value: new THREE.Vector2(1, 1) },
            uMouse: { value: new THREE.Vector2(0.5, 0.5) },
            uHover: { value: 0 },
        }),
        []
    );

    useEffect(() => {
        const handleMouseMove = (event) => {
            const rect = gl.domElement.getBoundingClientRect();

            const x = (event.clientX - rect.left) / rect.width;
            const y = 1 - (event.clientY - rect.top) / rect.height;

            const inside = x >= 0 && x <= 1 && y >= 0 && y <= 1;

            if (inside) {
                targetMouse.current.set(x, y);
                targetHover.current = 1;
            } else {
                targetHover.current = 0;
            }
        };

        window.addEventListener("mousemove", handleMouseMove);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
        };
    }, [gl]);

    useFrame(({ clock }) => {
        if (!meshRef.current) return;

        const material = meshRef.current.material;

        material.uniforms.uTime.value = clock.getElapsedTime();
        material.uniforms.uResolution.value.set(size.width, size.height);
        material.uniforms.uMouse.value.lerp(targetMouse.current, 0.08);
        material.uniforms.uHover.value +=
            (targetHover.current - material.uniforms.uHover.value) * 0.08;
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

const LiquidHeroBackground = () => {
    return (
        <Canvas
            dpr={[1, 2]}
            gl={{ antialias: true, alpha: false }}
            className="pointer-events-none absolute inset-0 h-full w-full"
        >
            <LiquidEvanoraPlane />
        </Canvas>
    );
};

// ---------------------------------------------------------------------------
// Navbar
// ---------------------------------------------------------------------------
const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <nav className="fixed left-0 right-0 top-4 z-50 flex w-full justify-center px-4">
            <div className="navbar-critical">
                <a
                    href="#home"
                    className="shrink-0 font-serif text-2xl italic text-foreground transition-opacity hover:opacity-80"
                >
                    Evanora.
                </a>

                <div className="hidden items-center gap-2 md:flex">
                    <a
                        href="#analysis"
                        className="rounded-full px-4 py-2 text-sm text-muted-foreground transition-all hover:-translate-y-0.5 hover:bg-brand-red/10 hover:text-foreground"
                    >
                        Feedback
                    </a>

                    <a
                        href="#login"
                        className="flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-all hover:-translate-y-0.5 hover:opacity-90"
                    >
                        Sign in
                        <ArrowRight size={15} />
                    </a>
                </div>

                <button
                    type="button"
                    className="text-foreground md:hidden"
                    onClick={() => setIsOpen((prev) => !prev)}
                    aria-label="Open navigation"
                >
                    {isOpen ? <X /> : <Menu />}
                </button>
            </div>

            {isOpen && (
                <div className="absolute left-4 right-4 top-20 rounded-[1.5rem] border border-border bg-card p-4 shadow-2xl md:hidden">
                    <div className="grid gap-2">
                        <a
                            href="#login"
                            onClick={() => setIsOpen(false)}
                            className="rounded-2xl border border-border bg-background/40 p-4 text-center font-serif text-xl text-foreground"
                        >
                            Sign in
                        </a>

                        <a
                            href="#analysis"
                            onClick={() => setIsOpen(false)}
                            className="rounded-2xl border border-border bg-background/40 p-4 text-center font-serif text-xl text-foreground"
                        >
                            Feedback
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
                        <span
                            key={j}
                            className="char inline-block"
                            style={{ willChange: "transform, opacity, filter" }}
                        >
                            {char}
                        </span>
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
const Hero = () => {
    const containerRef = useRef(null);

    useLayoutEffect(() => {
        const ctx = gsap.context(() => {
            gsap.to(containerRef.current, {
                scale: 1,
                opacity: 1,
                duration: 1.5,
                ease: "power3.out",
            });
        }, containerRef);

        return () => ctx.revert();
    }, []);

    return (
        <section
            id="home"
            className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-background perspective-[1200px]"
        >
            <div
                ref={containerRef}
                className="relative flex h-[95%] w-[95%] scale-90 items-center justify-center overflow-hidden rounded-[2rem] opacity-0"
                style={{ transformStyle: "preserve-3d" }}
            >
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
                        <SplitText delay={0.2} blur={24}>
                            Train Your Voice.
                        </SplitText>
                        <br />
                        <SplitText delay={0.8} blur={24}>
                            Own Every Interview
                        </SplitText>
                        <SplitText delay={1.8} blur={24}>
                            And Presentation
                        </SplitText>
                    </h1>

                    <div className="mt-8 md:mt-12">
                        <p className="font-sans text-xl tracking-tight text-white/90 md:text-2xl">
                            <SplitText delay={1.5} blur={12} scale={0} className="font-normal">
                                Evanora turns practice into confidence.
                            </SplitText>
                            <SplitText delay={3.5} blur={12} scale={0} className="font-normal">
                                Speak, analyze, improve, repeat.
                            </SplitText>
                        </p>
                    </div>

                    <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                        <a
                            href="#login"
                            className="rounded-full bg-white px-7 py-3 text-sm font-medium text-[#3a2422] transition-all hover:-translate-y-1 hover:bg-white/90"
                        >
                            Sign in
                        </a>

                        <a
                            href="#analysis"
                            className="rounded-full border border-white/25 bg-white/10 px-7 py-3 text-sm font-medium text-white backdrop-blur-xl transition-all hover:-translate-y-1 hover:bg-white/15"
                        >
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
            x: -totalWidth,
            duration: 30,
            repeat: -1,
            ease: "none",
            modifiers: {
                x: gsap.utils.unitize((x) => parseFloat(x) % totalWidth),
            },
        });

        return () => {
            tween.kill();
            clone.remove();
        };
    }, []);

    return (
        <div className="flex w-full items-center overflow-hidden bg-background py-24">
            <div ref={marqueeRef} className="flex gap-16 whitespace-nowrap">
                <div ref={textRef} className="flex select-none gap-16 pr-16">
                    {["PRACTICE", "PRESENT", "IMPROVE"].map((word) => (
                        <span
                            key={word}
                            className="font-serif text-[10vw] italic leading-none text-foreground/20"
                        >
                            {word}
                        </span>
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

            gsap.set(cardsRef.current, {
                transformPerspective: 1000,
                transformStyle: "preserve-3d",
            });

            const mm = gsap.matchMedia();

            mm.add("(min-width: 768px)", () => {
                const tl = gsap.timeline({
                    scrollTrigger: {
                        trigger: sectionRef.current,
                        start: "top top",
                        end: "+=3500",
                        scrub: 1,
                        pin: true,
                        anticipatePin: 1,
                    },
                });

                tl.to(titleRef.current, {
                    y: 0,
                    scale: 1,
                    opacity: 1,
                    duration: 1.2,
                    ease: "power3.out",
                });

                tl.to(
                    containerRef.current,
                    {
                        y: "0%",
                        duration: 1.5,
                        ease: "power3.out",
                    },
                    "-=0.8"
                );

                tl.to(containerRef.current, {
                    gap: "2rem",
                    duration: 1.5,
                    ease: "power2.inOut",
                });

                tl.to(
                    cardsRef.current,
                    {
                        borderRadius: "1rem",
                        duration: 1.5,
                        ease: "power2.inOut",
                    },
                    "<"
                );

                tl.to(cardsRef.current, {
                    rotateY: 180,
                    duration: 3,
                    stagger: { each: 0.1, from: "center" },
                    ease: "elastic.out(1, 0.8)",
                });

                tl.to(
                    cardsRef.current[0],
                    {
                        y: 30,
                        rotateZ: -5,
                        duration: 3,
                        ease: "power2.out",
                    },
                    "<"
                );

                tl.to(
                    cardsRef.current[2],
                    {
                        y: 30,
                        rotateZ: 5,
                        duration: 3,
                        ease: "power2.out",
                    },
                    "<"
                );
            });

            mm.add("(max-width: 767px)", () => {
                gsap.set(titleRef.current, { y: 0, opacity: 1, scale: 1 });
                gsap.set(containerRef.current, {
                    flexDirection: "column",
                    height: "auto",
                    y: 0,
                    gap: "1.5rem",
                    marginBottom: "4rem",
                });
                gsap.set(cardsRef.current, {
                    rotateY: 0,
                    borderRadius: "1rem",
                    width: "100%",
                    height: "auto",
                    minHeight: "500px",
                    y: 0,
                    rotateZ: 0,
                });
                gsap.set(sectionRef.current, {
                    height: "auto",
                    minHeight: "100vh",
                    paddingBottom: "4rem",
                });
            });
        }, sectionRef);

        return () => ctx.revert();
    }, []);

    const pillars = [
        {
            id: 1,
            number: "01",
            title: "Interview Practice",
            color: "#e9e4db",
            textColor: "#3a2422",
            desc: "Train with realistic AI interview questions.",
        },
        {
            id: 2,
            number: "02",
            title: "Presentation Mode",
            color: "#aa4761",
            textColor: "#e9e4db",
            desc: "Record your delivery and improve your speaking flow.",
        },
        {
            id: 3,
            number: "03",
            title: "Smart Feedback",
            color: "#653d3b",
            textColor: "#e9e4db",
            desc: "Get clear insights on confidence, clarity, and performance.",
        },
    ];

    return (
        <section
            ref={sectionRef}
            className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-background py-10 perspective-[2000px]"
        >
            <div className="z-20 mb-8 flex h-[20vh] items-end justify-center px-4">
                <div ref={titleRef} className="w-full text-center">
                    <h2 className="font-serif text-5xl font-light leading-none tracking-tight text-foreground md:text-7xl">
                        Evanora’s Practice Core
                    </h2>
                    <p className="mt-4 font-sans text-sm uppercase tracking-wide text-muted-foreground md:text-base">
                        Interview confidence, presentation clarity, and real feedback
                    </p>
                </div>
            </div>

            <div
                ref={containerRef}
                className="z-10 flex h-auto w-full max-w-7xl flex-col items-stretch justify-center px-4 md:h-[60vh] md:flex-row md:px-0"
                style={{ perspective: "2000px", transformStyle: "preserve-3d" }}
            >
                {pillars.map((pillar, index) => (
                    <div
                        key={pillar.id}
                        ref={(el) => (cardsRef.current[index] = el)}
                        className="relative h-auto min-h-[500px] w-full flex-none md:h-full md:min-h-0 md:w-[33.333%]"
                        style={{ transformStyle: "preserve-3d" }}
                    >
                        <div
                            className="absolute inset-0 hidden overflow-hidden bg-muted md:block"
                            style={{ backfaceVisibility: "hidden", borderRadius: "inherit" }}
                        >
                            <img
                                src="https://images.unsplash.com/photo-1551836022-d5d88e9218df?q=80&w=2400&auto=format&fit=crop"
                                alt="Evanora practice"
                                className="pointer-events-none absolute top-0 h-full object-cover"
                                style={{
                                    width: "300%",
                                    left: index === 0 ? "0%" : index === 1 ? "-100%" : "-200%",
                                    maxWidth: "none",
                                }}
                            />
                            <div className="absolute inset-0 bg-[#653d3b]/50" />
                            <div className="absolute inset-0 bg-gradient-to-br from-[#aa4761]/20 to-[#3a2422]/40" />
                        </div>

                        <style
                            dangerouslySetInnerHTML={{
                                __html: `
                                    @media (min-width: 768px) {
                                        .pillar-back-${pillar.id} { transform: rotateY(180deg); }
                                    }
                                `,
                            }}
                        />

                        <div
                            className={`relative inset-0 flex h-full min-h-[500px] flex-col justify-between border border-white/5 p-8 md:absolute md:min-h-0 md:p-10 pillar-back-${pillar.id}`}
                            style={{
                                backfaceVisibility: "hidden",
                                borderRadius: "inherit",
                                backgroundColor: pillar.color,
                                color: pillar.textColor,
                            }}
                        >
                            <div className="flex items-start justify-between border-b border-current/20 pb-4">
                                <span className="font-mono text-xl font-medium">{pillar.number}</span>
                                <div className="h-2 w-2 rounded-full bg-current opacity-50" />
                            </div>

                            <div className="space-y-5">
                                <h3 className="font-serif text-3xl leading-[0.9] tracking-tight md:text-4xl">
                                    {pillar.title.split(" ").map((word, i) => (
                                        <span key={i} className="block">
                                            {word}
                                        </span>
                                    ))}
                                </h3>
                                <p className="max-w-xs text-sm leading-relaxed opacity-75">
                                    {pillar.desc}
                                </p>
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
const BentoGrid = () => {
    const [graphData, setGraphData] = useState(
        Array(12)
            .fill(78)
            .map((_, i) => 78 + Math.sin(i) * 7)
    );
    const [confidence, setConfidence] = useState(84);
    const [activeMode, setActiveMode] = useState("Interview");

    const graphPathRef = useRef(null);
    const fillPathRef = useRef(null);
    const barsRef = useRef([]);
    const pulseRefs = useRef([]);

    const getControlPoint = (current, previous, next, reverse) => {
        const p = previous || current;
        const n = next || current;
        const smoothing = 0.2;
        const o = { x: p[0] - n[0], y: p[1] - n[1] };
        const angle = Math.atan2(o.y, o.x) + (reverse ? Math.PI : 0);
        const length = Math.sqrt(Math.pow(o.x, 2) + Math.pow(o.y, 2)) * smoothing;

        return [
            current[0] + Math.cos(angle) * length,
            current[1] + Math.sin(angle) * length,
        ];
    };

    const getSmoothPath = (points, width, height) => {
        if (!points || points.length === 0) return "";

        const max = Math.max(...points, 1);
        const min = Math.min(...points, 0);
        const range = max - min || 1;

        const data = points.map((val, i) => {
            const x = (i / (points.length - 1)) * width;
            const normalizedY = (val - min) / range;
            const y = height - (normalizedY * (height * 0.8) + height * 0.1);
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
        const updateGraph = () => {
            setGraphData((prev) => {
                const last = prev[prev.length - 1];
                const flow = Math.sin(Date.now() / 1000) * 5;
                const noise = (Math.random() - 0.5) * 6;
                let next = last + noise * 0.5 + flow * 0.2;
                next = Math.max(55, Math.min(97, next));
                return [...prev.slice(1), next];
            });

            setConfidence((value) => {
                const next = value + (Math.random() - 0.48) * 2;
                return Math.max(68, Math.min(96, next));
            });
        };

        const interval = setInterval(updateGraph, 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!graphPathRef.current) return;

        const width = 100;
        const height = 20;
        const newD = getSmoothPath(graphData, width, height);

        gsap.to(graphPathRef.current, {
            attr: { d: newD },
            duration: 0.8,
            ease: "power2.out",
        });

        if (fillPathRef.current) {
            const fillD = `${newD} V ${height} H 0 Z`;

            gsap.to(fillPathRef.current, {
                attr: { d: fillD },
                duration: 0.8,
                ease: "power2.out",
            });
        }
    }, [graphData]);

    const [time, setTime] = useState(0);

    useEffect(() => {
        let frame;

        const animate = () => {
            setTime((t) => t + 0.05);
            frame = requestAnimationFrame(animate);
        };

        frame = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(frame);
    }, []);

    useEffect(() => {
        barsRef.current.forEach((bar, i) => {
            if (!bar) return;

            const h = 42 + Math.sin(time + i * 0.6) * 24 + Math.sin(time * 0.5 + i) * 9;
            const clampedH = Math.max(16, Math.min(92, h));

            gsap.to(bar, {
                height: `${clampedH}%`,
                duration: 0.5,
                ease: "power1.out",
            });
        });
    }, [time]);

    useEffect(() => {
        pulseRefs.current.forEach((el, i) => {
            if (!el) return;

            gsap.to(el, {
                scale: 1.25,
                opacity: 0,
                duration: 2.3,
                repeat: -1,
                ease: "power1.out",
                delay: i * 0.45,
            });
        });
    }, []);

    const miniStats = [
        { label: "Confidence", value: `${Math.round(confidence)}%` },
        { label: "Clarity", value: "91%" },
        { label: "Pace", value: "Good" },
    ];

    const cardBase =
        "flow-anchor group relative overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-[0_24px_70px_rgba(58,36,34,0.08)] transition-all duration-300 hover:-translate-y-1 hover:border-brand-red/40 hover:shadow-[0_30px_90px_rgba(58,36,34,0.13)]";

    return (
        <section className="bg-background px-6 py-32 md:px-12" id="dashboard">
            <div className="mx-auto max-w-6xl">
                <div className="mb-20">
                    <span className="mb-4 inline-flex text-[11px] font-semibold uppercase tracking-[0.25em] text-brand-red">
                        Evanora Flow
                    </span>
                    <h2 className="mb-6 font-serif text-5xl leading-none tracking-tight text-foreground md:text-6xl">
                        A smoother way to practice speaking.
                    </h2>
                    <p className="max-w-2xl text-lg font-light text-muted-foreground md:text-xl">
                        A clean app flow: sign in, practice, record, receive feedback, and track progress.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-6">
                    <div className={`${cardBase} min-h-[540px] md:col-span-4`} id="dashboard-main">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(170,71,97,0.16),transparent_42%)]" />
                        <div className="relative z-10 flex h-full flex-col">
                            <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                                <div>
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-red">
                                        Dashboard
                                    </span>
                                    <h3 className="mt-3 font-serif text-5xl leading-[0.92] tracking-[-0.04em] text-foreground md:text-6xl">
                                        Practice cockpit.
                                    </h3>
                                    <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
                                        Continue training, check performance, and jump into the next
                                        interview or presentation simulation.
                                    </p>
                                </div>

                                <div className="flex h-28 w-28 shrink-0 flex-col items-center justify-center rounded-full border border-brand-red/25 bg-brand-red/10 text-center">
                                    <span className="text-4xl font-light text-foreground">
                                        {Math.round(confidence)}
                                    </span>
                                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                                        score
                                    </span>
                                </div>
                            </div>

                            <div className="rounded-[1.6rem] border border-border bg-background/35 p-5 backdrop-blur-md">
                                <div className="mb-8 flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Today’s session</p>
                                        <h4 className="mt-1 text-xl font-medium text-foreground">
                                            {activeMode} Training
                                        </h4>
                                    </div>
                                    <span className="flex items-center gap-1 rounded-full border border-brand-red/20 bg-brand-red/10 px-3 py-1 text-xs font-medium text-brand-red">
                                        <TrendingUp size={13} />
                                        Live
                                    </span>
                                </div>

                                <div className="my-8 h-24 w-full">
                                    <svg
                                        className="h-full w-full overflow-visible"
                                        preserveAspectRatio="none"
                                        viewBox="0 0 100 20"
                                    >
                                        <path
                                            ref={graphPathRef}
                                            d="M0,10 L100,10"
                                            fill="none"
                                            stroke="var(--brand-red)"
                                            strokeWidth="2"
                                            vectorEffect="non-scaling-stroke"
                                        />

                                        <path
                                            ref={fillPathRef}
                                            d="M0,10 L100,10 V20 H0 Z"
                                            fill="url(#evanora-chart-fill)"
                                            stroke="none"
                                            opacity="0.25"
                                        />

                                        <defs>
                                            <linearGradient id="evanora-chart-fill" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="var(--brand-red)" stopOpacity="0.6" />
                                                <stop offset="100%" stopColor="var(--brand-red)" stopOpacity="0" />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    {miniStats.map((stat) => (
                                        <MetricCard key={stat.label} label={stat.label} value={stat.value} />
                                    ))}
                                </div>
                            </div>

                            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                                {[
                                    { icon: <Brain size={17} />, label: "Quiz", href: "#mini-quiz" },
                                    { icon: <Sparkles size={17} />, label: "Simulate", href: "#simulation" },
                                    { icon: <Mic size={17} />, label: "Record", href: "#recording" },
                                    { icon: <FileText size={17} />, label: "Report", href: "#report" },
                                ].map((item) => (
                                    <a
                                        key={item.label}
                                        href={item.href}
                                        className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-brand-red/15 bg-brand-red/10 text-sm text-foreground transition-all hover:-translate-y-0.5 hover:bg-foreground hover:text-background"
                                    >
                                        {item.icon}
                                        <span>{item.label}</span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-6 md:col-span-2">
                        <div id="login" className={`${cardBase} min-h-[255px]`}>
                            <div className="relative z-10">
                                <div className="mb-6 flex items-center justify-between">
                                    <SoftIcon>
                                        <LogIn size={20} />
                                    </SoftIcon>
                                    <StepBadge>01</StepBadge>
                                </div>

                                <h3 className="font-serif text-4xl leading-none text-foreground">
                                    Sign in
                                </h3>
                                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                                    A clean entry point where the user continues their saved practice journey.
                                </p>

                                <div className="mt-6 flex h-11 items-center rounded-2xl border border-border bg-background/40 px-4 text-sm text-muted-foreground">
                                    student@email.com
                                </div>
                                <a
                                    href="#dashboard"
                                    className="mt-3 flex h-11 items-center justify-center rounded-2xl bg-foreground text-sm font-medium text-background transition-all hover:opacity-90"
                                >
                                    Enter dashboard
                                </a>
                            </div>
                        </div>

                        <div id="mini-quiz" className={`${cardBase} min-h-[255px]`}>
                            <div className="relative z-10">
                                <div className="mb-6 flex items-center justify-between">
                                    <SoftIcon>
                                        <Brain size={20} />
                                    </SoftIcon>
                                    <StepBadge>02</StepBadge>
                                </div>

                                <h3 className="font-serif text-4xl leading-none text-foreground">
                                    Mini Quiz
                                </h3>
                                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                                    Evanora understands the user before choosing the right practice mode.
                                </p>

                                <div className="mt-5 flex flex-wrap gap-2">
                                    {["Job interview", "Student level", "Confidence focus"].map((chip) => (
                                        <span
                                            key={chip}
                                            className="rounded-full border border-brand-red/15 bg-brand-red/10 px-3 py-1.5 text-xs text-brand-red"
                                        >
                                            {chip}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div id="simulation" className={`${cardBase} min-h-[430px] md:col-span-3`}>
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(170,71,97,0.13),transparent_58%)]" />
                        <div className="relative z-10 flex h-full flex-col">
                            <div className="mb-8 flex items-start justify-between">
                                <div>
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-red">
                                        Simulation
                                    </span>
                                    <h3 className="mt-3 font-serif text-5xl leading-none tracking-tight text-foreground">
                                        Choose the room.
                                    </h3>
                                </div>
                                <StepBadge>03</StepBadge>
                            </div>

                            <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
                                {[
                                    {
                                        title: "Job Interview",
                                        activeValue: "Interview",
                                        text: "Practice HR and technical questions.",
                                        icon: <Briefcase size={24} />,
                                    },
                                    {
                                        title: "Presentation",
                                        activeValue: "Presentation",
                                        text: "Practice delivery, timing, and clarity.",
                                        icon: <Presentation size={24} />,
                                    },
                                ].map((mode) => (
                                    <button
                                        key={mode.title}
                                        type="button"
                                        onClick={() => setActiveMode(mode.activeValue)}
                                        className={`rounded-[1.5rem] border p-5 text-left transition-all hover:-translate-y-1 ${
                                            activeMode === mode.activeValue
                                                ? "border-brand-red/40 bg-brand-red/10"
                                                : "border-border bg-background/35 hover:border-brand-red/30 hover:bg-brand-red/10"
                                        }`}
                                    >
                                        <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-red/10 text-brand-red">
                                            {mode.icon}
                                        </div>
                                        <h4 className="font-serif text-3xl leading-none text-foreground">
                                            {mode.title}
                                        </h4>
                                        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                                            {mode.text}
                                        </p>
                                        <span className="mt-6 inline-flex text-sm font-medium text-brand-red">
                                            Start mode
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div id="recording" className={`${cardBase} min-h-[430px] text-center md:col-span-3`}>
                        <div className="relative z-10 flex h-full flex-col items-center justify-center">
                            <div className="relative mb-10 flex items-center justify-center">
                                {[160, 230, 300].map((size, i) => (
                                    <div
                                        key={i}
                                        ref={(el) => (pulseRefs.current[i] = el)}
                                        className="absolute rounded-full border border-border"
                                        style={{ width: size, height: size }}
                                    />
                                ))}

                                <div className="relative z-10 flex h-28 w-28 items-center justify-center rounded-[2rem] border border-brand-red/25 bg-card text-brand-red shadow-[0_0_50px_rgba(170,71,97,0.16)]">
                                    <Mic size={42} />
                                </div>
                            </div>

                            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-red">
                                Recording
                            </span>
                            <h3 className="mt-3 font-serif text-5xl leading-none tracking-tight text-foreground">
                                Speak. Evanora listens.
                            </h3>
                            <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
                                The user records an answer or presentation, then Evanora prepares it for
                                confidence, clarity, pace, and content analysis.
                            </p>
                        </div>
                    </div>

                    <div id="analysis" className={`${cardBase} min-h-[360px] md:col-span-2`}>
                        <div className="relative z-10 flex h-full flex-col">
                            <div className="mb-8 flex items-start justify-between">
                                <div>
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-red">
                                        Feedback
                                    </span>
                                    <h3 className="mt-3 font-serif text-4xl leading-none text-foreground">
                                        Live analysis
                                    </h3>
                                </div>
                                <BarChart3 size={22} className="text-brand-red" />
                            </div>

                            <div className="mb-6 flex flex-1 items-end justify-between gap-3">
                                {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                                    <div key={i} className="flex h-full flex-1 items-end">
                                        <div
                                            ref={(el) => (barsRef.current[i] = el)}
                                            className="min-h-4 w-full rounded-t-full bg-gradient-to-t from-brand-red to-brand-red/20"
                                            style={{ height: "20%" }}
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                {miniStats.map((stat) => (
                                    <MetricCard key={stat.label} label={stat.label} value={stat.value} />
                                ))}
                            </div>
                        </div>
                    </div>

                    <div id="report" className={`${cardBase} min-h-[360px] md:col-span-2`}>
                        <div className="relative z-10">
                            <div className="mb-8 flex items-start justify-between">
                                <div>
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-red">
                                        Report
                                    </span>
                                    <h3 className="mt-3 font-serif text-4xl leading-none text-foreground">
                                        Clear next steps
                                    </h3>
                                </div>
                                <FileText size={22} className="text-brand-red" />
                            </div>

                            <div className="grid gap-3">
                                {[
                                    "Strong opening answer",
                                    "Reduce filler words",
                                    "Slow down while explaining examples",
                                    "Use a stronger closing sentence",
                                ].map((item) => (
                                    <div
                                        key={item}
                                        className="flex items-center gap-3 rounded-2xl border border-border bg-background/35 p-3 text-sm text-foreground"
                                    >
                                        <CheckCircle2 size={16} className="shrink-0 text-brand-red" />
                                        <span>{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div id="history" className={`${cardBase} min-h-[360px] md:col-span-2`}>
                        <div className="relative z-10">
                            <div className="mb-8 flex items-start justify-between">
                                <div>
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-red">
                                        History & Settings
                                    </span>
                                    <h3 className="mt-3 font-serif text-4xl leading-none text-foreground">
                                        Progress saved
                                    </h3>
                                </div>
                                <HistoryIcon size={22} className="text-brand-red" />
                            </div>

                            <div className="mb-4 grid gap-3">
                                {[
                                    ["Interview Practice", "86%", "Today"],
                                    ["Presentation Mode", "78%", "Yesterday"],
                                    ["Mini Quiz", "Done", "2 days ago"],
                                ].map(([title, score, date]) => (
                                    <div
                                        key={title}
                                        className="flex items-center justify-between rounded-2xl border border-border bg-background/35 p-3"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-red/10 text-brand-red">
                                                <Clock3 size={15} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-foreground">{title}</p>
                                                <p className="text-xs text-muted-foreground">{date}</p>
                                            </div>
                                        </div>
                                        <p className="font-mono text-xs text-brand-red">{score}</p>
                                    </div>
                                ))}
                            </div>

                            <a
                                href="#settings"
                                className="inline-flex items-center gap-2 rounded-full border border-brand-red/15 bg-brand-red/10 px-4 py-2 text-sm text-foreground transition-all hover:bg-foreground hover:text-background"
                            >
                                <SlidersHorizontal size={15} />
                                Open practice settings
                            </a>
                        </div>
                    </div>

                    <div id="settings" className={`${cardBase} min-h-[240px] md:col-span-6`}>
                        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                            <div>
                                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-red">
                                    Settings
                                </span>
                                <h3 className="mt-3 font-serif text-4xl leading-none text-foreground">
                                    Personalize the practice experience.
                                </h3>
                                <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
                                    Users can adjust practice language, feedback depth, mode difficulty,
                                    and saved progress preferences.
                                </p>
                            </div>

                            <div className="grid gap-2 sm:grid-cols-2">
                                {["Language", "Difficulty", "Feedback depth", "Saved history"].map((item) => (
                                    <div
                                        key={item}
                                        className="rounded-2xl border border-border bg-background/35 px-4 py-3 text-sm text-foreground"
                                    >
                                        <div className="flex items-center gap-2">
                                            <SettingsIcon size={15} className="text-brand-red" />
                                            {item}
                                        </div>
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
        {
            name: "Sara Khaled",
            role: "Computer Science Student",
            text: "Evanora made interview practice feel realistic. The feedback helped me notice mistakes I never paid attention to before.",
        },
        {
            name: "Omar Naser",
            role: "Fresh Graduate",
            text: "The report was simple and useful. I knew exactly what to improve before my next presentation.",
        },
        {
            name: "Lina Haddad",
            role: "Business Student",
            text: "I liked switching between interview mode and presentation mode. It felt like a complete speaking coach.",
        },
        {
            name: "Yazan Saleh",
            role: "Job Seeker",
            text: "The confidence score and history section helped me see real progress after every practice session.",
        },
    ];

    useLayoutEffect(() => {
        let animation;

        const ctx = gsap.context(() => {
            const lists = containerRef.current.querySelectorAll(".testimonial-list");

            animation = gsap.to(lists, {
                xPercent: -100,
                duration: 40,
                ease: "none",
                repeat: -1,
            });
        }, containerRef);

        const scroller = containerRef.current;
        const onEnter = () => animation && animation.timeScale(0);
        const onLeave = () => animation && animation.timeScale(1);

        scroller.addEventListener("mouseenter", onEnter);
        scroller.addEventListener("mouseleave", onLeave);

        return () => {
            ctx.revert();
            scroller.removeEventListener("mouseenter", onEnter);
            scroller.removeEventListener("mouseleave", onLeave);
        };
    }, []);

    return (
        <section className="overflow-hidden bg-background py-32" id="testimonials">
            <div className="mx-auto mb-20 max-w-6xl px-6 md:px-0">
                <h2 className="font-serif text-5xl text-foreground md:text-6xl">
                    Student Reactions.
                </h2>
                <p className="mt-4 text-lg text-muted-foreground">
                    Built for people who want to speak better.
                </p>
            </div>

            <div className="w-full overflow-hidden">
                <div ref={containerRef} className="flex w-max">
                    {[0, 1].map((i) => (
                        <div key={i} className="testimonial-list flex gap-8 pr-8">
                            {testimonials.map((t, index) => (
                                <div
                                    key={index}
                                    className="group flex w-[300px] cursor-default flex-col justify-between rounded-2xl border border-border bg-muted/50 p-6 transition-all duration-300 hover:border-brand-red hover:bg-muted/80 md:w-[450px] md:p-12"
                                >
                                    <div className="relative mb-8">
                                        <span className="absolute -left-2 -top-4 font-serif text-6xl text-brand-red/20">
                                            "
                                        </span>
                                        <p className="relative z-10 font-sans text-lg leading-relaxed text-foreground/80 md:text-xl">
                                            {t.text}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-4 border-t border-border pt-6">
                                        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-border bg-background text-muted-foreground">
                                            <img
                                                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${t.name.replace(" ", "")}`}
                                                alt={t.name}
                                                className="h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
                                            />
                                        </div>

                                        <div>
                                            <h4 className="font-medium text-foreground transition-colors group-hover:text-brand-red">
                                                {t.name}
                                            </h4>
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
        {
            id: 1,
            title: "AI Interview Questions",
            desc: "Generate realistic questions based on the student’s goal and level.",
        },
        {
            id: 2,
            title: "Presentation Practice Mode",
            desc: "Practice delivery, timing, clarity, and confidence before presenting.",
        },
        {
            id: 3,
            title: "Real-Time Feedback",
            desc: "Analyze speaking pace, filler words, structure, and answer strength.",
        },
        {
            id: 4,
            title: "Progress Tracking",
            desc: "Save reports and show improvement across repeated practice sessions.",
        },
    ];

    return (
        <section className="bg-background px-6 py-32 md:px-12" id="capabilities">
            <div className="mx-auto max-w-6xl">
                <h2 className="mb-24 font-serif text-5xl text-foreground opacity-90 md:text-6xl">
                    Evanora Capabilities.
                </h2>

                <div className="grid grid-cols-1 gap-x-12 gap-y-24 md:grid-cols-2">
                    {services.map((service, index) => (
                        <div
                            key={service.id}
                            className="group cursor-pointer border-t border-white/20 pt-8 transition-colors duration-500 hover:border-brand-red"
                        >
                            <div className="mb-4 flex items-start justify-between">
                                <span className="font-mono text-sm text-foreground/40">
                                    0{index + 1}
                                </span>

                                <ArrowUpRight
                                    className="text-foreground/0 transition-all duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-brand-red"
                                    size={24}
                                />
                            </div>

                            <h3 className="mb-4 font-serif text-3xl text-foreground transition-transform duration-300 group-hover:translate-x-2 md:text-4xl">
                                {service.title}
                            </h3>

                            <p className="max-w-sm font-sans text-foreground/60 transition-transform delay-75 duration-300 group-hover:translate-x-2">
                                {service.desc}
                            </p>
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
const Footer = () => {
    const containerRef = useRef(null);
    const imageRef = useRef(null);
    const contentRef = useRef(null);

    useLayoutEffect(() => {
        const ctx = gsap.context(() => {
            gsap.to(imageRef.current, {
                y: "20%",
                ease: "none",
                scrollTrigger: {
                    trigger: containerRef.current,
                    start: "top bottom",
                    end: "bottom top",
                    scrub: true,
                },
            });

            gsap.from(contentRef.current.children, {
                y: 50,
                opacity: 0,
                duration: 1.5,
                stagger: 0.1,
                ease: "power3.out",
                scrollTrigger: {
                    trigger: containerRef.current,
                    start: "top 70%",
                },
            });
        }, containerRef);

        return () => ctx.revert();
    }, []);

    return (
        <footer className="relative flex h-auto w-full items-center justify-center bg-background p-4 md:h-screen">
            <div
                ref={containerRef}
                className="relative flex h-full min-h-[600px] w-full flex-col justify-between gap-12 overflow-hidden rounded-[2rem] border border-white/10 p-6 md:max-h-[96vh] md:min-h-0 md:gap-0 md:p-12"
            >
                <div className="absolute inset-0 z-0">
                    <img
                        ref={imageRef}
                        src="https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=2400&auto=format&fit=crop"
                        alt="Evanora final section"
                        className="-mt-[10%] h-[120%] w-full object-cover object-center"
                    />
                    <div className="absolute inset-0 bg-[#653d3b]/40 mix-blend-multiply" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#3a1a18]/90 via-[#653d3b]/20 to-transparent" />
                    <div className="absolute inset-0 bg-black/10" />
                </div>

                <div className="relative z-10 flex w-full flex-1 flex-col items-center justify-center">
                    <div ref={contentRef} className="space-y-8 text-center">
                        <p className="font-sans text-lg tracking-wide text-white/80 md:text-xl">
                            Every confident speaker starts with one practice session
                        </p>

                        <h2 className="font-serif text-5xl leading-[0.9] tracking-tight text-white md:text-8xl lg:text-9xl">
                            Start <span className="font-light italic">speaking</span>
                            <br />
                            better
                        </h2>

                        <div className="pt-8">
                            <a
                                href="#login"
                                className="inline-flex items-center justify-center rounded-full bg-white px-8 py-4 text-lg font-medium text-black transition-all duration-300 hover:scale-105 hover:bg-gray-200 active:scale-95"
                            >
                                Sign in to Evanora
                            </a>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 mt-12 flex w-full flex-col items-center justify-between gap-6 border-t border-white/10 pt-8 font-sans text-sm text-white/50 md:flex-row md:gap-0">
                    <div>
                        <p>© 2026 Evanora | All Rights Reserved.</p>
                    </div>

                    <div>
                        <a href="#analysis" className="transition-colors hover:text-white">
                            Feedback
                        </a>
                    </div>

                    <div className="flex gap-8">
                        <a href="#login" className="transition-colors hover:text-white">
                            Sign in
                        </a>
                        <a href="#simulation" className="transition-colors hover:text-white">
                            Practice
                        </a>
                        <a href="#report" className="transition-colors hover:text-white">
                            Report
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
const App = () => {
    useEffect(() => {
        const lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            direction: "vertical",
            smooth: true,
        });

        function raf(time) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }

        requestAnimationFrame(raf);

        return () => lenis.destroy();
    }, []);

    return (
        <div className="relative overflow-x-hidden bg-background text-foreground antialiased selection:bg-brand-red selection:text-white">
            <Navbar />

            <main>
                <Hero />
                <Marquee />
                <ThreePillars />
                <BentoGrid />
                <Testimonials />
                <Services />
            </main>

            <Footer />
        </div>
    );
};

export default App;