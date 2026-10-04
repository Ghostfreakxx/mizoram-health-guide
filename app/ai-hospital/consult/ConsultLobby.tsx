"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { isValidRoomId } from "../../lib/consult";
import DeviceCheck from "./DeviceCheck";
import SummaryPicker from "./SummaryPicker";
import CallLink from "../../components/ui/CallLink";

const ConsultRoom3D = dynamic(() => import("./ConsultRoom3D"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-lg font-semibold text-blue-900">Loading consulting room…</div>,
});

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border-2 border-slate-200 bg-white p-6">
      <h2 className="flex items-center gap-3 text-2xl font-bold text-blue-950">
        <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-900 text-lg text-white">{n}</span>
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function ConsultLobby({ liveEnabled, esanjeevaniUrl, esanjeevaniVerified }: { liveEnabled: boolean; esanjeevaniUrl: string; esanjeevaniVerified: boolean }) {
  const router = useRouter();
  const [show3D, setShow3D] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState(false);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-4 text-lg text-red-950">
        🚨 <strong>Not for emergencies.</strong> Chest pain, breathing difficulty, heavy bleeding, fits, or a very sick baby — call{" "}
        <CallLink id="ambulance-108" className="font-bold underline">108</CallLink> or <CallLink id="erss-112" className="font-bold underline">112</CallLink> now.
      </div>

      <div className="overflow-hidden rounded-2xl border-2 border-slate-200 bg-slate-100">
        <div className="h-[300px] sm:h-[420px]">
          {show3D ? (
            <div role="img" aria-label="3D view of a doctor's consulting room. The doctor's chair is empty until a real doctor joins." className="h-full w-full">
              <ConsultRoom3D doctorPresent={false} screenText="Your consulting room — getting ready" />
            </div>
          ) : (
            <div className="grid h-full place-items-center bg-gradient-to-br from-blue-100 to-slate-200 p-6 text-center">
              <div>
                <p className="text-6xl" aria-hidden>🩺</p>
                <p className="mt-3 text-lg text-slate-700">Step into a 3D consulting room while you get ready to talk to a real doctor.</p>
                <button type="button" onClick={() => setShow3D(true)} className="mt-4 rounded-xl bg-blue-900 px-6 py-4 text-xl font-bold text-white hover:bg-blue-800">
                  ▶ Enter the consulting room
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Step n={1} title="Check your camera and microphone">
        <DeviceCheck />
      </Step>

      <Step n={2} title="Have your summary ready">
        <SummaryPicker />
      </Step>

      <Step n={3} title="Talk to a real doctor">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-5">
            <h3 className="text-xl font-bold text-blue-950">🎥 Live video with a doctor</h3>
            {liveEnabled ? (
              <>
                <p className="mt-2 text-lg text-slate-700">If a doctor or health worker gave you a consultation link or code, open it here.</p>
                <form
                  className="mt-3 flex flex-col gap-2 sm:flex-row"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const c = code.trim().toLowerCase();
                    if (isValidRoomId(c)) router.push(`/ai-hospital/consult/live/${c}`);
                    else setCodeError(true);
                  }}
                >
                  <label htmlFor="room-code" className="sr-only">Consultation code</label>
                  <input id="room-code" value={code} onChange={(e) => { setCode(e.target.value); setCodeError(false); }} placeholder="mhg-…" className="flex-1 rounded-xl border-2 border-slate-300 px-4 py-3 text-lg" maxLength={30} />
                  <button type="submit" className="rounded-xl bg-blue-900 px-5 py-3 text-lg font-bold text-white">Join</button>
                </form>
                {codeError && <p role="alert" className="mt-2 text-red-800">That code does not look right. Check the link you were sent.</p>}
              </>
            ) : (
              <p className="mt-2 text-lg text-slate-700">
                <strong>Not available yet.</strong> Live consultations with AI Hospital doctors will start when the Health Department&apos;s
                doctor panel is ready. Until then, use the government service below.
              </p>
            )}
          </div>

          <div className="rounded-2xl border-2 border-slate-200 p-5">
            <h3 className="text-xl font-bold text-blue-950">💻 eSanjeevani (government)</h3>
            <p className="mt-2 text-lg text-slate-700">The Government of India&apos;s online consultation service with real doctors.</p>
            {!esanjeevaniVerified && <p className="mt-2 text-sm text-amber-900">Access details are being verified — follow the instructions on the official website.</p>}
            <a href={esanjeevaniUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block rounded-xl bg-blue-900 px-5 py-3 text-lg font-bold text-white">
              Open official website ↗<span className="sr-only"> (opens external website in a new tab)</span>
            </a>
          </div>

          <div className="rounded-2xl border-2 border-violet-200 bg-violet-50 p-5">
            <h3 className="text-xl font-bold text-violet-950">🧠 Mental health — talk now</h3>
            <p className="mt-2 text-lg text-violet-950">Tele-MANAS: free, confidential counselling by phone, 24 hours.</p>
            <CallLink id="telemanas" className="mt-3 inline-block rounded-xl bg-violet-800 px-5 py-3 text-lg font-bold text-white">📞 Call 14416</CallLink>
          </div>

          <div className="rounded-2xl border-2 border-slate-200 p-5">
            <h3 className="text-xl font-bold text-blue-950">🏥 In person</h3>
            <p className="mt-2 text-lg text-slate-700">Some problems need an examination or tests.</p>
            <div className="mt-3 flex flex-col gap-1">
              <Link href="/ai-hospital/departments" className="font-semibold text-blue-700 underline">Find the right department →</Link>
              <Link href="/find-care#hospitals" className="font-semibold text-blue-700 underline">Find a hospital →</Link>
            </div>
          </div>
        </div>
      </Step>

      <p className="text-sm text-slate-600">
        AI Hospital does not provide medical advice itself and is not affiliated with eSanjeevani. Consultations are with registered doctors.
      </p>
    </div>
  );
}
