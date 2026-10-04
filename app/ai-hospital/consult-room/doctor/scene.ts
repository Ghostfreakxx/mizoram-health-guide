// Shared consulting-room layout (metres, y up, the patient looks along -z).
// The room, the camera and the doctor all read these, so the doctor's hands
// rest on the real desk and her glances land on the real chart screen.

export const LAYOUT = {
  deskY: 0.78, // desk top
  deskFrontZ: -0.18, // edge nearest the patient
  seatY: 0.5, // doctor's chair seat
  doctorZ: -1.05, // doctor's hips
  handZ: 0.4, // hands rest this far in front of the doctor's shoulders
  // The patient's eyes: seated, about 1.15–1.3 m from the doctor
  camera: { position: [0, 1.2, 0.02] as [number, number, number], target: [0, 1.17, -0.95] as [number, number, number] },
  // The chart screen on the desk, turned so both can see it
  chart: { position: [-0.54, 1.02, -0.8] as [number, number, number], rotationY: 1.85 },
  tablet: { position: [0.24, 0.79, -0.58] as [number, number, number] },
};
