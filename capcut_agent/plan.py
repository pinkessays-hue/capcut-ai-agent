"""2단계: 컷 점수 계산 -> 불필요 컷 제거 -> 숏폼 순서 추천."""
import numpy as np


def score_scenes(scenes, cfg):
    sharps = np.array([s["sharp_raw"] for s in scenes])
    # 영상 안의 "보통 컷"(중앙값)을 기준으로 상대 평가: 보통=0.5, 2배 이상 선명=1.0
    ref = (float(np.median(sharps)) * 2) or 1.0
    for s in scenes:
        s["sharpness"] = round(float(min(s["sharp_raw"] / ref, 1.0)), 2)
        reasons = []
        if s["duration"] < cfg["한_컷_최소_길이_초"]:
            reasons.append("너무 짧음")
        if s["sharpness"] < cfg["흐린_컷_제거_기준"]:
            reasons.append("흐림/초점 불량")
        if s["brightness"] < cfg["어두운_컷_제거_기준"]:
            reasons.append("너무 어두움")
        if s["motion"] < cfg["정지_컷_제거_기준"] and s["duration"] > 1.5:
            reasons.append("화면 변화 거의 없음")
        s["remove_reasons"] = reasons
        motion_n = min(s["motion"] / 0.04, 1.0)
        bright_ok = 1.0 if 70 <= s["brightness"] <= 200 else 0.5
        s["score"] = round(0.45 * s["sharpness"] + 0.35 * motion_n + 0.2 * bright_ok, 3)


def build_plan(scenes, cfg):
    max_clip = cfg["한_컷_최대_길이_초"]
    target = cfg["목표_길이_초"]
    keep = sorted((s for s in scenes if not s["remove_reasons"]),
                  key=lambda s: -s["score"])

    chosen, total = [], 0.0
    for s in keep:
        length = min(s["duration"], max_clip)
        if total + length > target + 0.01:
            continue
        # 컷이 길면 가운데 부분을 사용
        offset = (s["duration"] - length) / 2
        chosen.append({**s, "clip_start": round(s["start"] + offset, 2),
                       "clip_len": round(length, 2)})
        total += length
        if total >= target - 0.3:
            break
    if not chosen:
        return []

    # 첫 컷(훅)=점수 최고 컷, 나머지는 촬영 순서(조립/변형 과정 흐름 유지)
    hook = max(chosen, key=lambda s: s["score"])
    rest = sorted((s for s in chosen if s is not hook), key=lambda s: s["start"])
    ordered = [hook] + rest
    for n, s in enumerate(ordered, 1):
        s["order"] = n
        s["role"] = "훅(첫 3초)" if n == 1 else ("마무리" if n == len(ordered) else "본문")
    return ordered
