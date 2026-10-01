"""사용법: python run.py 영상.mp4   (또는 input 폴더에 영상을 넣고 python run.py)"""
import json
import sys
from pathlib import Path

from capcut_agent.analyze import analyze_video
from capcut_agent.export import export_clips, save_thumbnails, write_reports
from capcut_agent.plan import build_plan, score_scenes

EXT = {".mp4", ".mov", ".mkv", ".avi", ".m4v"}
ROOT = Path(__file__).parent


def process(video, cfg):
    video = Path(video)
    out = ROOT / "output" / video.stem
    out.mkdir(parents=True, exist_ok=True)
    print(f"\n[1/3] 분석 중: {video.name}")
    info = analyze_video(str(video), cfg)
    score_scenes(info["scenes"], cfg)
    print(f"      장면 {len(info['scenes'])}개 감지")
    print("[2/3] 컷 구성안 만드는 중")
    plan = build_plan(info["scenes"], cfg)
    if not plan:
        print("      사용할 만한 컷이 없습니다. config.json의 제거 기준을 완화해 보세요.")
        return
    print("[3/3] 영상/문서 출력 중")
    save_thumbnails(video, info["scenes"], out)
    write_reports(video, info, plan, out)
    export_clips(video, plan, out, cfg)
    print(f"완료! 결과 폴더: {out}\n  - plan.md (구성안)  - reels_draft.mp4 (숏폼 초안)  - clips (컷별 영상)")


def main():
    cfg = json.loads((ROOT / "config.json").read_text(encoding="utf-8"))
    args = [a for a in sys.argv[1:]]
    videos = [Path(a) for a in args] or sorted(
        p for p in (ROOT / "input").iterdir() if p.suffix.lower() in EXT)
    if not videos:
        print("input 폴더에 영상 파일을 넣어 주세요.")
        return
    for v in videos:
        try:
            process(v, cfg)
        except Exception as e:
            print(f"오류 ({v.name}): {e}")


if __name__ == "__main__":
    main()
