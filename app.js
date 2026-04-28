const imageInput = document.getElementById("imageInput");
const resetBtn = document.getElementById("resetBtn");
const kernelGrid = document.getElementById("kernelGrid");
const sourceCanvas = document.getElementById("sourceCanvas");
const resultCanvas = document.getElementById("resultCanvas");

const sourceCtx = sourceCanvas.getContext("2d", { willReadFrequently: true });
const resultCtx = resultCanvas.getContext("2d", { willReadFrequently: true });

const MAX_WIDTH = 720;
const MAX_HEIGHT = 480;
const DEFAULT_KERNEL = [0, 0, 0, 0, 1, 0, 0, 0, 0];

const PRESETS = {
  identity: [0, 0, 0, 0, 1, 0, 0, 0, 0],
  sobel: [-1, 0, 1, -2, 0, 2, -1, 0, 1],
  blur: [1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9],
  sharpen: [0, -1, 0, -1, 5, -1, 0, -1, 0],
  laplacian: [0, 1, 0, 1, -4, 1, 0, 1, 0],
};

let originalImageData = null;

function createKernelInputs() {
  for (let i = 0; i < 9; i += 1) {
    const input = document.createElement("input");
    input.type = "number";
    input.step = "0.01";
    input.value = DEFAULT_KERNEL[i];
    input.dataset.index = String(i);
    input.addEventListener("input", () => {
      if (originalImageData) {
        applyConvolution();
      }
    });
    kernelGrid.appendChild(input);
  }
}

function getKernel() {
  const values = Array.from(kernelGrid.querySelectorAll("input")).map((input) => {
    const num = Number.parseFloat(input.value);
    return Number.isFinite(num) ? num : 0;
  });
  return values;
}

function setKernel(values) {
  const inputs = kernelGrid.querySelectorAll("input");
  values.forEach((v, idx) => {
    inputs[idx].value = Number(v.toFixed(4)).toString();
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

function resetAll() {
  originalImageData = null;
  setKernel(DEFAULT_KERNEL);
  sourceCanvas.width = 360;
  sourceCanvas.height = 240;
  resultCanvas.width = 360;
  resultCanvas.height = 240;
  drawPlaceholder(sourceCtx, sourceCanvas, "请先上传图片");
  drawPlaceholder(resultCtx, resultCanvas, "卷积结果将在这里显示");
  imageInput.value = "";
}

function applyConvolution() {
  if (!originalImageData) return;

  const { width, height, data } = originalImageData;
  const kernel = getKernel();
  const output = new Uint8ClampedArray(data.length);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0;

      for (let ky = -1; ky <= 1; ky += 1) {
        for (let kx = -1; kx <= 1; kx += 1) {
          const nx = x + kx;
          const ny = y + ky;
          const kernelValue = kernel[(ky + 1) * 3 + (kx + 1)];
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

          const i = (ny * width + nx) * 4;
          const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
          sum += gray * kernelValue;
        }
      }

      const pixelIndex = (y * width + x) * 4;
      const value = Math.max(0, Math.min(255, Math.round(sum)));
      output[pixelIndex] = value;
      output[pixelIndex + 1] = value;
      output[pixelIndex + 2] = value;
      output[pixelIndex + 3] = data[pixelIndex + 3];
    }
  }

  const result = new ImageData(output, width, height);
  resultCtx.putImageData(result, 0, 0);
}

function handleImageUpload(file) {
  const img = new Image();
  const reader = new FileReader();

  reader.onload = (e) => {
    img.onload = () => {
      const adapted = adaptSize(img.width, img.height);
      sourceCanvas.width = adapted.width;
      sourceCanvas.height = adapted.height;
      resultCanvas.width = adapted.width;
      resultCanvas.height = adapted.height;

      sourceCtx.clearRect(0, 0, adapted.width, adapted.height);
      sourceCtx.drawImage(img, 0, 0, adapted.width, adapted.height);
      originalImageData = sourceCtx.getImageData(0, 0, adapted.width, adapted.height);
      applyConvolution();
    };
    img.src = e.target?.result;
  };

  reader.readAsDataURL(file);
}

imageInput.addEventListener("change", (event) => {
  const [file] = event.target.files || [];
  if (!file) return;
  handleImageUpload(file);
});

resetBtn.addEventListener("click", resetAll);

document.querySelectorAll("[data-preset]").forEach((button) => {
  button.addEventListener("click", () => {
    const presetName = button.dataset.preset;
    const presetKernel = PRESETS[presetName];
    if (!presetKernel) return;
    setKernel(presetKernel);
    if (originalImageData) {
      applyConvolution();
    }
  });
});

createKernelInputs();
resetAll();
