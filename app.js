const imageInput = document.getElementById("imageInput");
const resetBtn = document.getElementById("resetBtn");
const downloadBtn = document.getElementById("downloadBtn");
const kernelGrid = document.getElementById("kernelGrid");
const sourceCanvas = document.getElementById("sourceCanvas");
const resultCanvas = document.getElementById("resultCanvas");
const kernelSizeSelect = document.getElementById("kernelSizeSelect");
const strideInput = document.getElementById("strideInput");
const paddingInput = document.getElementById("paddingInput");
const hoverTip = document.getElementById("hoverTip");
const kernelTitle = document.querySelector(".kernel-section h2");

const sourceCtx = sourceCanvas.getContext("2d", { willReadFrequently: true });
const resultCtx = resultCanvas.getContext("2d", { willReadFrequently: true });

const MAX_WIDTH = 720;
const MAX_HEIGHT = 480;
const DEFAULT_SAMPLE_SRC = "./assets/sample.jpg";

const KERNEL_PRESETS = {
  3: {
    identity: [0, 0, 0, 0, 1, 0, 0, 0, 0],
    sobel: [-1, 0, 1, -2, 0, 2, -1, 0, 1],
    blur: [1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9],
    sharpen: [0, -1, 0, -1, 5, -1, 0, -1, 0],
    laplacian: [0, 1, 0, 1, -4, 1, 0, 1, 0],
    gaussian: [1 / 16, 2 / 16, 1 / 16, 2 / 16, 4 / 16, 2 / 16, 1 / 16, 2 / 16, 1 / 16],
    edgeEnhance: [0, -1, 0, -1, 6, -1, 0, -1, 0],
  },
  5: {
    identity: [
      0, 0, 0, 0, 0,
      0, 0, 0, 0, 0,
      0, 0, 1, 0, 0,
      0, 0, 0, 0, 0,
      0, 0, 0, 0, 0,
    ],
    sobel: [
      -1, -2, 0, 2, 1,
      -4, -8, 0, 8, 4,
      -6, -12, 0, 12, 6,
      -4, -8, 0, 8, 4,
      -1, -2, 0, 2, 1,
    ],
    blur: new Array(25).fill(1 / 25),
    sharpen: [
      0, 0, -1, 0, 0,
      0, -1, -1, -1, 0,
      -1, -1, 13, -1, -1,
      0, -1, -1, -1, 0,
      0, 0, -1, 0, 0,
    ],
    laplacian: [
      0, 0, -1, 0, 0,
      0, -1, -2, -1, 0,
      -1, -2, 16, -2, -1,
      0, -1, -2, -1, 0,
      0, 0, -1, 0, 0,
    ],
    gaussian: [
      1 / 273, 4 / 273, 7 / 273, 4 / 273, 1 / 273,
      4 / 273, 16 / 273, 26 / 273, 16 / 273, 4 / 273,
      7 / 273, 26 / 273, 41 / 273, 26 / 273, 7 / 273,
      4 / 273, 16 / 273, 26 / 273, 16 / 273, 4 / 273,
      1 / 273, 4 / 273, 7 / 273, 4 / 273, 1 / 273,
    ],
    edgeEnhance: [
      -1, -1, -1, -1, -1,
      -1, 2, 2, 2, -1,
      -1, 2, 8, 2, -1,
      -1, 2, 2, 2, -1,
      -1, -1, -1, -1, -1,
    ].map((v) => v / 8),
  },
};

let originalImageData = null;
let resultImageData = null;
let kernelSize = Number.parseInt(kernelSizeSelect.value, 10);

function getIdentityKernel(size) {
  const length = size * size;
  const values = new Array(length).fill(0);
  values[Math.floor(length / 2)] = 1;
  return values;
}

function getDefaultKernel(size) {
  const preset = KERNEL_PRESETS[size];
  return preset ? [...preset.identity] : getIdentityKernel(size);
}

function createKernelInputs(size) {
  kernelGrid.innerHTML = "";
  kernelGrid.style.setProperty("--grid-size", String(size));
  kernelTitle.textContent = `卷积核（${size}x${size}）`;

  for (let i = 0; i < size * size; i += 1) {
    const input = document.createElement("input");
    input.type = "number";
    input.step = "0.01";
    input.value = "0";
    input.dataset.index = String(i);
    input.addEventListener("input", () => {
      if (originalImageData) applyConvolution();
    });
    kernelGrid.appendChild(input);
  }

  setKernel(getDefaultKernel(size));
}

function getKernel() {
  return Array.from(kernelGrid.querySelectorAll("input")).map((input) => {
    const num = Number.parseFloat(input.value);
    return Number.isFinite(num) ? num : 0;
  });
}

function setKernel(values) {
  const inputs = kernelGrid.querySelectorAll("input");
  values.forEach((v, idx) => {
    if (!inputs[idx]) return;
    inputs[idx].value = Number(v.toFixed(6)).toString();
  });
}

function adaptSize(width, height) {
  const scale = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height, 1);
  return {
    width: Math.floor(width * scale),
    height: Math.floor(height * scale),
  };
}

function drawPlaceholder(ctx, canvas, text) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "16px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
}

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function getStride() {
  const value = Number.parseInt(strideInput.value, 10);
  if (!Number.isInteger(value) || value < 1) return 1;
  return value;
}

function getPadding() {
  const value = Number.parseInt(paddingInput.value, 10);
  if (!Number.isInteger(value) || value < 0) return 0;
  return value;
}

function resetAll() {
  originalImageData = null;
  resultImageData = null;
  kernelSize = Number.parseInt(kernelSizeSelect.value, 10);
  createKernelInputs(kernelSize);
  strideInput.value = "1";
  paddingInput.value = "1";
  sourceCanvas.width = 360;
  sourceCanvas.height = 240;
  resultCanvas.width = 360;
  resultCanvas.height = 240;
  drawPlaceholder(sourceCtx, sourceCanvas, "请先上传图片");
  drawPlaceholder(resultCtx, resultCanvas, "卷积结果将在这里显示");
  hoverTip.textContent = "将鼠标移动到结果图上，查看该点的局部卷积计算信息。";
  imageInput.value = "";
}

function renderImageToCanvases(img) {
  const adapted = adaptSize(img.width, img.height);
  sourceCanvas.width = adapted.width;
  sourceCanvas.height = adapted.height;
  resultCanvas.width = adapted.width;
  resultCanvas.height = adapted.height;
  sourceCtx.clearRect(0, 0, adapted.width, adapted.height);
  sourceCtx.drawImage(img, 0, 0, adapted.width, adapted.height);
  originalImageData = sourceCtx.getImageData(0, 0, adapted.width, adapted.height);
  applyConvolution();
}

function applyConvolution() {
  if (!originalImageData) return;
  const { width, height, data } = originalImageData;
  const kernel = getKernel();
  const size = Math.sqrt(kernel.length);
  const stride = getStride();
  const padding = getPadding();
  const outWidth = Math.max(1, Math.floor((width - size + 2 * padding) / stride) + 1);
  const outHeight = Math.max(1, Math.floor((height - size + 2 * padding) / stride) + 1);
  const output = new Uint8ClampedArray(outWidth * outHeight * 4);

  for (let oy = 0; oy < outHeight; oy += 1) {
    for (let ox = 0; ox < outWidth; ox += 1) {
      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      const srcStartX = ox * stride - padding;
      const srcStartY = oy * stride - padding;

      for (let ky = 0; ky < size; ky += 1) {
        for (let kx = 0; kx < size; kx += 1) {
          const srcX = srcStartX + kx;
          const srcY = srcStartY + ky;
          if (srcX < 0 || srcX >= width || srcY < 0 || srcY >= height) continue;

          const i = (srcY * width + srcX) * 4;
          const kernelValue = kernel[ky * size + kx];
          sumR += data[i] * kernelValue;
          sumG += data[i + 1] * kernelValue;
          sumB += data[i + 2] * kernelValue;
        }
      }

      const pixelIndex = (oy * outWidth + ox) * 4;
      const r = clampByte(sumR);
      const g = clampByte(sumG);
      const b = clampByte(sumB);
      output[pixelIndex] = r;
      output[pixelIndex + 1] = g;
      output[pixelIndex + 2] = b;
      output[pixelIndex + 3] = 255;
    }
  }

  resultCanvas.width = outWidth;
  resultCanvas.height = outHeight;
  resultImageData = new ImageData(output, outWidth, outHeight);
  resultCtx.putImageData(resultImageData, 0, 0);
}

function formatNeighborhood(resultX, resultY) {
  if (!originalImageData) return "";
  const { width, height, data } = originalImageData;
  const kernel = getKernel();
  const size = Math.sqrt(kernel.length);
  const padding = getPadding();
  const stride = getStride();
  const lines = [];
  let sum = 0;
  const srcStartX = resultX * stride - padding;
  const srcStartY = resultY * stride - padding;

  for (let ky = 0; ky < size; ky += 1) {
    const row = [];
    for (let kx = 0; kx < size; kx += 1) {
      const srcX = srcStartX + kx;
      const srcY = srcStartY + ky;
      const kernelValue = kernel[ky * size + kx];
      let gray = 0;

      if (srcX >= 0 && srcX < width && srcY >= 0 && srcY < height) {
        const i = (srcY * width + srcX) * 4;
        gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      }

      sum += gray * kernelValue;
      row.push(`${gray.toFixed(1)}×${kernelValue.toFixed(2)}`);
    }
    lines.push(row.join(" | "));
  }

  return `输出像素(${resultX}, ${resultY})\n窗口起点=(${srcStartX}, ${srcStartY}) stride=${stride} padding=${padding}\n${lines.join("\n")}\n灰度示意和: ${sum.toFixed(2)}`;
}

function handleImageUpload(file) {
  const img = new Image();
  const reader = new FileReader();
  reader.onload = (e) => {
    img.onload = () => renderImageToCanvases(img);
    img.src = e.target?.result;
  };
  reader.readAsDataURL(file);
}

function loadDefaultSampleImage() {
  const img = new Image();
  img.onload = () => renderImageToCanvases(img);
  img.onerror = () => resetAll();
  img.src = DEFAULT_SAMPLE_SRC;
}

function applyPreset(name) {
  const sizePreset = KERNEL_PRESETS[kernelSize];
  if (!sizePreset || !sizePreset[name]) return;
  setKernel(sizePreset[name]);
  if (originalImageData) applyConvolution();
}

function downloadResultImage() {
  if (!resultImageData) return;
  const a = document.createElement("a");
  a.href = resultCanvas.toDataURL("image/png");
  a.download = `convolution-${kernelSize}x${kernelSize}.png`;
  a.click();
}

imageInput.addEventListener("change", (event) => {
  const [file] = event.target.files || [];
  if (!file) return;
  handleImageUpload(file);
});

kernelSizeSelect.addEventListener("change", () => {
  kernelSize = Number.parseInt(kernelSizeSelect.value, 10);
  createKernelInputs(kernelSize);
  if (originalImageData) applyConvolution();
});

strideInput.addEventListener("input", () => {
  if (originalImageData) applyConvolution();
});

paddingInput.addEventListener("input", () => {
  if (originalImageData) applyConvolution();
});

resetBtn.addEventListener("click", resetAll);
downloadBtn.addEventListener("click", downloadResultImage);

document.querySelectorAll("[data-preset]").forEach((button) => {
  button.addEventListener("click", () => applyPreset(button.dataset.preset));
});

resultCanvas.addEventListener("mousemove", (event) => {
  if (!originalImageData) return;
  const rect = resultCanvas.getBoundingClientRect();
  const x = Math.floor(((event.clientX - rect.left) / rect.width) * resultCanvas.width);
  const y = Math.floor(((event.clientY - rect.top) / rect.height) * resultCanvas.height);
  hoverTip.textContent = formatNeighborhood(x, y);
});

resultCanvas.addEventListener("mouseleave", () => {
  hoverTip.textContent = "将鼠标移动到结果图上，查看该点的局部卷积计算信息。";
});

createKernelInputs(kernelSize);
loadDefaultSampleImage();
