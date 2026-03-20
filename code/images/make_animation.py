from PIL import Image
import argparse

parser = argparse.ArgumentParser(description="Create an animated GIF from two images")
parser.add_argument("image1", help="Path to the first image")
parser.add_argument("image2", help="Path to the second image")
parser.add_argument("--output", "-o", default="output.gif", help="Output GIF file name (default: output.gif)")
args = parser.parse_args()

img1 = Image.open(args.image1)
img2 = Image.open(args.image2)

img1.save(
    args.output,
    save_all=True,
    append_images=[img2],
    duration=500,  # milliseconds per frame
    loop=0         # 0 = infinite loop
)