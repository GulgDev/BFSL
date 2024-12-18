const VERT_SHADER = `#version 300 es

precision lowp float;

in vec2 a_position;

out vec2 v_texcoord;

void main() {
    v_texcoord = a_position;
    gl_Position = vec4(a_position * vec2(2.0, -2.0) + vec2(-1.0, 1.0), 0.0, 1.0);
}
`;

const getCellValue = (i="i") => `((buf[${i} / 4u] >> ((${i} % 4u) * 8u)) & 0xFFu)`;
const setCellValue = (value, i="i") => `buf[${i} / 4u] = (buf[${i} / 4u] & ~(0xFFu << ((${i} % 4u) * 8u))) | ((${value}) & 0xFFu) << ((${i} % 4u) * 8u)`;

function compile(code) {
    code = code.replaceAll(/[^\[\]\+\-\<\>]/g, "");
    let result = "";
    for (let i = 0; i < code.length; ++i)
        switch (code[i]) {
            case "[":
                result += `while (${getCellValue()} > 0u) {\n`;
                break;
            case "]":
                result += "}\n";
                break;
            case "+":
                result += setCellValue(getCellValue() + " + 1u") + ";\n";
                break;
            case "-":
                result += setCellValue(getCellValue() + " - 1u") + ";\n";
                break;
            case ">":
                result += "i++;\n";
                break;
            case "<":
                result += "i--;\n";
                break;
        }
    return `#version 300 es

        precision lowp float;

        in vec2 v_texcoord;

        out vec4 fragColor;

        void main() {
            uint buf[750];
            uint i = 0u;
            ${setCellValue("uint(v_texcoord.x * 255.0)", "1u")};
            ${setCellValue("uint(v_texcoord.y * 255.0)", "2u")};
            ${result}
            fragColor = vec4(
                float(${getCellValue("3u")}) / 255.0,
                float(${getCellValue("4u")}) / 255.0,
                float(${getCellValue("5u")}) / 255.0,
                1.0
            );
        }
    `;
}

function draw() {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(shaderProgram);
    gl.enableVertexAttribArray(positionAttribute);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    requestAnimationFrame(draw);
}

function loadShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
    }
    return shader;
}

function updateShader() {
    const fragmentShader = loadShader(gl.FRAGMENT_SHADER, compile(editor.value));

    if (shaderProgram) gl.deleteProgram(shaderProgram);
    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
}

const editor = document.querySelector("#editor");

let updateTimeout;

editor.addEventListener("input", () => {
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(updateShader, 500);
});

const canvas = document.querySelector("#canvas");
const gl = canvas.getContext("webgl2");

gl.clearColor(0.0, 0.0, 0.0, 1.0);
gl.clear(gl.COLOR_BUFFER_BIT);

const vertexShader = loadShader(gl.VERTEX_SHADER, VERT_SHADER);

let shaderProgram;
updateShader();

const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
const positions = [1.0, 1.0, 0.0, 1.0, 1.0, 0.0, 0.0, 0.0];
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

const positionAttribute = gl.getAttribLocation(shaderProgram, "a_position");
gl.vertexAttribPointer(positionAttribute, 2, gl.FLOAT, false, 0, 0);

draw();