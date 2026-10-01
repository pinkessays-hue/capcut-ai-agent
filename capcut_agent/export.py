"""3단계: 결과 파일 출력 (컷 mp4, 합본 mp4, 미리보기 이미지, 구성안 문서)."""
import json
import subprocess
from pathlib import Path

import cv2
import imageio_ffmpeg

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()


def _run(cmd):
    # 출력은 바이트로 받아 직접 해석한다 (한국어 Windows에서 글자 해석 오류 방지)
    r = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    if r.returncode != 0:
        raise RuntimeError(r.stderr.decode("utf-8", errors="replace")[-800:])


def _vf(mode):
    if mode == "crop":
        return "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1"
    if mode == "fit":
        return "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1"
    return "setsar=1"


def save_thumbnails(video, scenes, outdir):
    d = Path(outdir) / "thumbnails"
    d.mkdir(parents=True, exist_ok=True)
    cap = cv2.VideoCapture(str(video))
    for s in scenes:
        cap.set(cv2.CAP_PROP_POS_MSEC, (s["start"] + s["duration"] / 2) * 1000)
        ok, f = cap.read()
        if ok:
            good, buf = cv2.imencode(".jpg", f)
            if good:
                (d / f"scene_{s['id']:02d}.jpg").write_bytes(buf.tobytes())
    cap.release()


def export_clips(video, plan, outdir, cfg):
    out = Path(outdir)
    clips = out / "clips"
    clips.mkdir(parents=True, exist_ok=True)
    files = []
    for s in plan:
        f = clips / f"{s['order']:02d}_scene{s['id']:02d}.mp4"
        _run([FFMPEG, "-y", "-ss", str(s["clip_start"]), "-i", str(video),
              "-t", str(s["clip_len"]), "-an", "-vf", _vf(cfg["세로영상_변환"]),
              "-c:v", "libx264", "-preset", "fast", "-crf", "20",
              "-pix_fmt", "yuv420p", "-r", "30", str(f)])
        files.append(f)
    # 목록 파일에는 파일명만 적는다 (한글 경로 문제 방지)
    listing = clips / "_concat.txt"
    listing.write_text("".join(f"file '{p.name}'\n" for p in files), encoding="utf-8")
    final = out / "reels_draft.mp4"
    _run([FFMPEG, "-y", "-f", "concat", "-safe", "0", "-i", str(listing),
          "-c", "copy", str(final)])
    listing.unlink()
    return final


def write_reports(video, info, plan, outdir):
    out = Path(outdir)
    (out / "scenes.json").write_text(
        json.dumps(info, ensure_ascii=False, indent=2), encoding="utf-8")
    L = [f"# 편집 구성안: {Path(video).name}", "",
         f"- 원본 길이: {info['duration']}초 / 감지된 장면: {len(info['scenes'])}개",
         f"- 추천 숏폼 길이: {sum(s['clip_len'] for s in plan):.1f}초 ({len(plan)}컷)", "",
         "## 추천 컷 순서", "",
         "| 순서 | 역할 | 원본 구간(초) | 길이 | 점수 |", "|---|---|---|---|---|"]
    for s in plan:
        L.append(f"| {s['order']} | {s['role']} | {s['clip_start']}~{s['clip_start']+s['clip_len']:.1f} "
                 f"| {s['clip_len']} | {s['score']} |")
    L += ["", "## 제거 추천 구간", ""]
    removed = [s for s in info["scenes"] if s["remove_reasons"]]
    if not removed:
        L.append("- 없음")
    for s in removed:
        L.append(f"- {s['start']}~{s['end']}초: {', '.join(s['remove_reasons'])}")
    L += ["", "## 전체 장면 목록", "", "| # | 구간(초) | 선명도 | 밝기 | 움직임 | 점수 | 비고 |",
          "|---|---|---|---|---|---|---|"]
    used = {s["id"] for s in plan}
    for s in info["scenes"]:
        note = "사용" if s["id"] in used else (", ".join(s["remove_reasons"]) or "후보(길이 초과)")
        L.append(f"| {s['id']} | {s['start']}~{s['end']} | {s['sharpness']} | "
                 f"{s['brightness']} | {s['motion']} | {s['score']} | {note} |")
    L += ["", "미리보기 이미지는 `thumbnails` 폴더, 컷별 영상은 `clips` 폴더에 있습니다."]
    (out / "plan.md").write_text("\n".join(L), encoding="utf-8")
