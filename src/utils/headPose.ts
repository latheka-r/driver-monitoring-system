// Head pose (pitch/yaw/roll) derived from MediaPipe FaceLandmarker's
// facial transformation matrix (a 4x4 matrix returned when
// outputFacialTransformationMatrixes is enabled). This is a real rotation
// matrix extracted from the 3D face mesh fit, not a naive single-point
// approximation.

export interface HeadPose {
  pitch: number; // degrees, negative = looking down
  yaw: number;   // degrees, negative = looking left (from viewer's POV)
  roll: number;  // degrees
}

// matrix is column-major, length 16 (Float32Array), as returned by
// MediaPipe's Matrix data type.
export function headPoseFromMatrix(matrix: number[] | Float32Array): HeadPose {
  // Convert column-major 4x4 to a standard 3x3 rotation matrix (row-major)
  const m = matrix;
  const r00 = m[0], r10 = m[1], r20 = m[2];
  const r01 = m[4], r11 = m[5], r21 = m[6];
  const r02 = m[8], r12 = m[9], r22 = m[10];

  // Extract Euler angles (XYZ convention) from rotation matrix
  const sy = Math.sqrt(r00 * r00 + r10 * r10);
  const singular = sy < 1e-6;

  let pitch: number, yaw: number, roll: number;

  if (!singular) {
    pitch = Math.atan2(-r20, sy);
    yaw = Math.atan2(r10, r00);
    roll = Math.atan2(r21, r22);
  } else {
    pitch = Math.atan2(-r20, sy);
    yaw = Math.atan2(-r01, r11);
    roll = 0;
  }

  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  return {
    pitch: toDeg(pitch),
    yaw: toDeg(yaw),
    roll: toDeg(roll)
  };
}

export type HeadOrientationLabel =
  | 'Normal'
  | 'Looking Down'
  | 'Looking Up'
  | 'Looking Left'
  | 'Looking Right';

export function classifyHeadOrientation(
  pose: HeadPose,
  pitchDownThreshold = -15,
  pitchUpThreshold = 20,
  yawThreshold = 20
): HeadOrientationLabel {
  if (pose.pitch < pitchDownThreshold) return 'Looking Down';
  if (pose.pitch > pitchUpThreshold) return 'Looking Up';
  if (pose.yaw > yawThreshold) return 'Looking Right';
  if (pose.yaw < -yawThreshold) return 'Looking Left';
  return 'Normal';
}
