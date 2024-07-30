"use client";
import React, { useState, useRef, useEffect, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Camera, Plus, X, Download, Upload, ClipboardCopy } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import axios from "axios";
import { toast } from "sonner";
import { ColorSwatch } from "@/components/ColorSwatch";
import MeshGradient from "mesh-gradient.js";

const DiamondLogoCreator: React.FC = () => {
  const [colors, setColors] = useState<string[]>(["#ee99ff", "#5effd0"]);
  const [prompt, setPrompt] = useState<string>("");
  const [angle, setAngle] = useState<number>(45);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isMeshGradient, setIsMeshGradient] = useState<boolean>(false);
  const [meshId, setMeshId] = useState<number>(780);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const gradientRef = useRef<any>(null);

  useEffect(() => {
    if (isMeshGradient && canvasRef.current) {
      gradientRef.current = new MeshGradient();
      gradientRef.current.initGradient("#mesh-canvas", colors);
      gradientRef.current.changePosition(meshId);

      // Apply diamond shape mask after rendering the gradient
      applyDiamondMask();
    }
  }, [isMeshGradient, colors, meshId]);

  const applyDiamondMask = () => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const { width, height } = canvas;

        // Create a temporary canvas to hold the original gradient
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext("2d");
        if (tempCtx) {
          tempCtx.drawImage(canvas, 0, 0);

          // Clear the original canvas
          ctx.clearRect(0, 0, width, height);

          // Create a diamond path
          ctx.beginPath();
          ctx.moveTo(width / 2, 0);
          ctx.lineTo(width, height / 2);
          ctx.lineTo(width / 2, height);
          ctx.lineTo(0, height / 2);
          ctx.closePath();

          // Clip to the diamond shape
          ctx.clip();

          // Draw the gradient back onto the clipped region
          ctx.drawImage(tempCanvas, 0, 0);
        }
      }
    }
  };

  const handleColorChange = (index: number, color: string): void => {
    const newColors = [...colors];
    newColors[index] = color;
    setColors(newColors);
    if (isMeshGradient && gradientRef.current) {
      gradientRef.current.changeGradientColors(newColors);
      setTimeout(applyDiamondMask, 0);
    }
  };

  const addColor = (): void => {
    const newColor = "#FFFFFF";
    const newColors = [...colors, newColor];
    setColors(newColors);
    if (isMeshGradient && gradientRef.current) {
      gradientRef.current.changeGradientColors(newColors);
      setTimeout(applyDiamondMask, 0);
    }
  };

  const removeColor = (index: number): void => {
    if (colors.length > 2) {
      const newColors = colors.filter((_, i) => i !== index);
      setColors(newColors);
      if (isMeshGradient && gradientRef.current) {
        gradientRef.current.changeGradientColors(newColors);
        setTimeout(applyDiamondMask, 0);
      }
    } else {
      toast.error("Minimum two colors are required.");
    }
  };

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        setPreviewImage(e.target?.result as string);
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(
              0,
              0,
              canvas.width,
              canvas.height
            );
            const extractedColors = extractColors(imageData.data);
            setColors(extractedColors);
            if (isMeshGradient && gradientRef.current) {
              gradientRef.current.changeGradientColors(extractedColors);
              setTimeout(applyDiamondMask, 0);
            }
          }
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const extractColors = (pixels: Uint8ClampedArray): string[] => {
    const colorCounts: { [key: string]: number } = {};
    for (let i = 0; i < pixels.length; i += 4) {
      const color = `#${pixels[i].toString(16).padStart(2, "0")}${pixels[i + 1]
        .toString(16)
        .padStart(2, "0")}${pixels[i + 2].toString(16).padStart(2, "0")}`;
      colorCounts[color] = (colorCounts[color] || 0) + 1;
    }
    return Object.entries(colorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([color]) => color);
  };

  const generateColorsFromPrompt = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt before generating colors.");
      return;
    }

    setIsLoading(true);
    try {
      const res = (await axios.post("/api/color", { prompt })).data;
      setColors(res.colors);
      if (isMeshGradient && gradientRef.current) {
        gradientRef.current.changeGradientColors(res.colors);
        setTimeout(applyDiamondMask, 0);
      }
    } catch (error) {
      toast.error("Please try Again");
    }
    setIsLoading(false);
  };

  const exportImage = (): void => {
    if (canvasRef.current) {
      const dataURL = canvasRef.current.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = dataURL;
      downloadLink.download = "diamond_mesh_gradient.png";
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } else if (svgRef.current) {
      const svgData = new XMLSerializer().serializeToString(svgRef.current);
      const svgBlob = new Blob([svgData], {
        type: "image/svg+xml;charset=utf-8",
      });
      const svgUrl = URL.createObjectURL(svgBlob);
      const downloadLink = document.createElement("a");
      downloadLink.href = svgUrl;
      downloadLink.download = "diamond_logo.svg";
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  const regenerateMesh = () => {
    const newMeshId = Math.floor(Math.random() * 1000);
    setMeshId(newMeshId);
    if (gradientRef.current) {
      gradientRef.current.changePosition(newMeshId);
      // Re-apply the diamond mask after regenerating
      setTimeout(applyDiamondMask, 0);
    }
  };

  const removeImage = (): void => {
    setPreviewImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const convertCanvasToSVG = () => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if(!ctx) return ""
      const svgNS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(svgNS, "svg");
      svg.setAttribute("width", canvas.width.toString());
      svg.setAttribute("height", canvas.height.toString());

      // This is a simplified conversion. You may need to add more logic
      // depending on what's actually drawn on your canvas.
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const index = (y * canvas.width + x) * 4;
          if (imageData.data[index + 3] > 0) {
            // If pixel is not transparent
            const rect = document.createElementNS(svgNS, "rect");
            rect.setAttribute("x", x.toString());
            rect.setAttribute("y", y.toString());
            rect.setAttribute("width", "1");
            rect.setAttribute("height", "1");
            rect.setAttribute(
              "fill",
              `rgb(${imageData.data[index]}, ${imageData.data[index + 1]}, ${
                imageData.data[index + 2]
              })`
            );
            svg.appendChild(rect);
          }
        }
      }

      const serializer = new XMLSerializer();
      return serializer.serializeToString(svg);
    }
    return "";
  };

  const copyToClipboard = () => {
    const svgString = convertCanvasToSVG();
    console.log("string", svgString)
    navigator.clipboard
      .writeText(svgString)
      .then(() => {
        alert("SVG copied to clipboard!");
      })
      .catch((err) => {
        console.error("Failed to copy: ", err);
      });
  };

  return (
    <Card className="w-full max-w-4xl mx-auto my-4">
      <CardHeader>
        <div className="flex items-center justify-start space-x-4">
          <img
            src="dlogo.jpg"
            alt="Logo Creator"
            className="w-12 h-12 object-cover rounded"
          />
        </div>
        <CardTitle className="text-2xl font-bold text-center">
          Diamond Logo Creator
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 flex flex-col">
              <Label
                htmlFor="image-upload"
                className="text-sm font-medium mb-2"
              >
                Upload Image
              </Label>
              <div className="flex-1 flex flex-col justify-between gap-4">
                <div className="w-20 h-20 mr-4 relative">
                  {previewImage ? (
                    <>
                      <img
                        src={previewImage}
                        alt="Uploaded preview"
                        className="w-full h-full object-cover rounded-full"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={removeImage}
                        className="absolute top-0 right-0 z-10 rounded-full bg-background border border-input h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </>
                  ) : (
                    <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center">
                      <Camera className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                </div>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-grow"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Choose Image
                </Button>
                <Input
                  id="image-upload"
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            </div>
            <div className="flex-1 flex flex-col">
              <Label htmlFor="prompt" className="text-sm font-medium mb-2">
                Prompt
              </Label>
              <div className="flex-1 flex flex-col">
                <Textarea
                  id="prompt"
                  value={prompt}
                  placeholder="I am feeling blue"
                  onChange={(e) => setPrompt(e.target.value)}
                  className="resize-none flex-grow mb-2"
                />
                <Button
                  onClick={generateColorsFromPrompt}
                  disabled={isLoading || !prompt.trim()}
                  className="w-full"
                >
                  Generate
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap justify-start gap-6 items-center">
            {colors.map((color, index) => (
              <ColorSwatch
                key={index}
                color={color}
                index={index}
                handleColorChange={handleColorChange}
                removeColor={removeColor}
              />
            ))}
          </div>
          <Button onClick={addColor}>Add Color</Button>
          <div className="flex items-center space-x-2">
            <Switch
              id="mesh-gradient"
              checked={isMeshGradient}
              onCheckedChange={setIsMeshGradient}
            />
            <Label htmlFor="mesh-gradient">Use Mesh Gradient</Label>
          </div>
          {isMeshGradient && (
            <Button onClick={regenerateMesh}>Regenerate Mesh</Button>
          )}
          {!isMeshGradient && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="gradient-angle" className="text-sm font-medium">
                  Gradient Angle
                </Label>
                <span className="text-sm font-medium bg-secondary text-secondary-foreground px-2 py-2 rounded-full">
                  {angle}°
                </span>
              </div>
              <Slider
                id="gradient-angle"
                min={0}
                max={360}
                step={1}
                value={[angle]}
                onValueChange={(value) => setAngle(value[0])}
                className="w-full"
              />
            </div>
          )}
          <div className="flex justify-center">
            {isMeshGradient ? (
              <div className="relative w-full max-w-xs aspect-[2/1]">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className="w-full h-full"
                    style={{
                      clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
                    }}
                  >
                    <canvas
                      id="mesh-canvas"
                      ref={canvasRef}
                      width={500}
                      height={250}
                      className="w-full h-full"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <svg
                ref={svgRef}
                width="400"
                height="200"
                viewBox="0 0 300 150"
                className="w-full max-w-xs"
              >
                <defs>
                  <linearGradient
                    id="diamondGradient"
                    gradientTransform={`rotate(${angle})`}
                  >
                    {colors.map((color, index) => (
                      <stop
                        key={index}
                        offset={`${(index / (colors.length - 1)) * 100}%`}
                        stopColor={color}
                      />
                    ))}
                  </linearGradient>
                </defs>
                <path
                  d="M150 0 L300 75 L150 150 L0 75 Z"
                  fill="url(#diamondGradient)"
                />
              </svg>
            )}
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="w-full">
                <Download className="mr-2 h-4 w-4" /> Export{" "}
                {isMeshGradient ? "PNG" : "SVG"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Export {isMeshGradient ? "PNG" : "SVG"}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Your diamond logo{" "}
                  {isMeshGradient ? "with mesh gradient (PNG)" : "SVG"} is ready
                  to download.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogAction onClick={exportImage}>
                  Download
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
};

export default DiamondLogoCreator;
