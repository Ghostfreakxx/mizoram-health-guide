export default function FireAura() {
  return (
    <section className="relative h-[500px] overflow-hidden bg-black flex items-center justify-center">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,80,0,0.45),transparent_45%)] animate-pulse" />

      <div className="absolute w-[380px] h-[380px] rounded-full border-[18px] border-orange-500/70 shadow-[0_0_80px_rgba(255,90,0,0.9)] rotate-[-12deg]" />

      <div className="absolute w-[260px] h-[260px] rounded-full bg-orange-600/30 blur-3xl animate-pulse" />

      <div className="absolute bottom-0 w-full h-32 bg-gradient-to-t from-orange-700/40 to-transparent" />

      <h1 className="relative z-10 text-5xl font-black tracking-widest text-orange-200 drop-shadow-[0_0_25px_orange]">
        GENESIS MODE
      </h1>
    </section>
  );
}