import cv2
import os

video_path = r"C:\Users\cemya\.openclaw\media\outbound\28f6c36c-808e-49b2-8f0b-76db33e88ebc.mp4"
output_dir = r"C:\Users\cemya\.openclaw\workspace\pm-turkish\frames"
os.makedirs(output_dir, exist_ok=True)

cap = cv2.VideoCapture(video_path)
fps = cap.get(cv2.CAP_PROP_FPS)
total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
duration = total_frames / fps if fps > 0 else 0

print(f"Video: {total_frames} frames @ {fps:.2f} fps = {duration:.2f}s")
print(f"Extracting 1 frame every 0.1s...")

frame_interval = int(fps * 0.1)  # frames per 0.1s
extracted = 0
saved = []

for i in range(0, total_frames, frame_interval):
    cap.set(cv2.CAP_PROP_POS_FRAMES, i)
    ret, frame = cap.read()
    if ret:
        ts = i / fps if fps > 0 else i * 0.1
        filename = f"frame_{extracted:04d}_{ts:.1f}s.png"
        path = os.path.join(output_dir, filename)
        cv2.imwrite(path, frame)
        saved.append((extracted, ts, filename))
        extracted += 1

cap.release()
print(f"Extracted {extracted} frames to {output_dir}")
for s in saved:
    print(f"  Frame {s[0]:04d}: t={s[1]:.1f}s → {s[2]}")
