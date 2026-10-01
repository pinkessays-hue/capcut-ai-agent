"""1단계: 영상에서 장면을 나누고 컷마다 품질 점수를 계산한다."""
import cv2
import numpy as np

ANALYSIS_FPS = 5


def _hist(frame):
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    h = cv2.calcHist([hsv], [0, 1], None, [16, 8], [0, 180, 0, 256])
    return cv2.normalize(h, h).flatten()


def analyze_video(path, cfg):
    cap = cv2.VideoCapture(path)
    if not cap.isOpened():
        raise RuntimeError(f"영상을 열 수 없습니다: {path}")
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    step = max(1, round(fps / ANALYSIS_FPS))

    samples = []  # (time, hist, small_gray, sharp, bright)
    i = 0
    while True:
        if not cap.grab():
            break
        if i % step == 0:
            ok, frame = cap.retrieve()
            if ok:
                h, w = frame.shape[:2]
                small = cv2.resize(frame, (320, max(2, int(320 * h / w))))
                gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
                samples.append((
                    i / fps,
                    _hist(small),
                    cv2.resize(gray, (64, 36)).astype(np.float32) / 255,
                    float(cv2.Laplacian(gray, cv2.CV_64F).var()),
                    float(gray.mean()),
                ))
        i += 1
    cap.release()
    duration = max(total / fps, samples[-1][0] if samples else 0)
    if len(samples) < 2:
        raise RuntimeError("영상이 너무 짧거나 읽을 수 없습니다.")

    # 장면 전환 감지
    cuts = [0]
    for k in range(1, len(samples)):
        d = cv2.compareHist(samples[k - 1][1], samples[k][1], cv2.HISTCMP_BHATTACHARYYA)
        if d > cfg["장면전환_민감도"]:
            cuts.append(k)
    cuts.append(len(samples))

    scenes = []
    for a, b in zip(cuts[:-1], cuts[1:]):
        seg = samples[a:b]
        start = seg[0][0]
        end = samples[b][0] if b < len(samples) else duration
        motion = float(np.mean([np.abs(seg[j][2] - seg[j - 1][2]).mean()
                                for j in range(1, len(seg))])) if len(seg) > 1 else 0.0
        scenes.append({
            "start": round(start, 2), "end": round(end, 2),
            "sharp_raw": float(np.mean([s[3] for s in seg])),
            "brightness": round(float(np.mean([s[4] for s in seg])), 1),
            "motion": round(motion, 4),
        })

    # 너무 짧은 장면은 앞 장면에 합친다 (장면 전환 오탐 방지)
    merged = []
    for s in scenes:
        if merged and s["end"] - s["start"] < 0.6:
            merged[-1]["end"] = s["end"]
        else:
            merged.append(s)
    for n, s in enumerate(merged, 1):
        s["id"] = n
        s["duration"] = round(s["end"] - s["start"], 2)
    return {"fps": fps, "duration": round(duration, 2), "scenes": merged}
