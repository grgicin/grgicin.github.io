window.onload = function() {
    const canvas = document.getElementById("canvas");
    const gl = canvas.getContext("webgl");

    if (!gl) {
        alert("WebGL not supported!");
        return;
    }

    function updateCanvasSize() {
        const devicePixelRatio = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * devicePixelRatio;
        canvas.height = window.innerHeight * devicePixelRatio;

        gl.viewport(0, 0, canvas.width, canvas.height);
    }
    updateCanvasSize();

    window.addEventListener('resize', function() {
        updateCanvasSize();
    });

    function loadImageAsync(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = src;
            img.onload = () => resolve(img);
            img.onerror = (err) => reject(err);
        });
    }

    const vertexShaderSource = `
        attribute vec2 a_position;
        varying vec2 v_texCoord;

        void main() {
            gl_Position = vec4(a_position, 0.0, 1.0);
            v_texCoord = (a_position + 1.0) / 2.0; // Map [-1, 1] to [0, 1]
        }
    `;

    const fragmentShaderSource = `
        precision mediump float;
        
        uniform float u_time;
        uniform sampler2D u_texture;
        
        varying vec2 v_texCoord;
        
        void main() {
            vec2 center = vec2(0.5, 0.5);

            float aspect = float(${canvas.width}) / float(${canvas.height});
            vec2 correctedCoord = vec2((v_texCoord.x - 0.5) * aspect + 0.5, v_texCoord.y);

            float dist = length(correctedCoord - center); 

            float radius = 0.4; 
            float smoothEdge = smoothstep(radius - 0.05, radius, dist);

            if (dist > radius) {
                gl_FragColor = texture2D(u_texture, v_texCoord); 
            } else {
                float angle = dist * 20.0 - u_time * 2.0; 
                float swirlAmount = dist * 0.2; 
                vec2 swirl = vec2(cos(angle), sin(angle)) * swirlAmount + v_texCoord; 

                vec4 color = texture2D(u_texture, swirl);
                gl_FragColor = mix(color, texture2D(u_texture, v_texCoord), smoothEdge); 
            }
        }
    `;

    function compileShader(source, type) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error("Shader compile error: " + gl.getShaderInfoLog(shader));
            return null;
        }
        return shader;
    }

    const vertexShader = compileShader(vertexShaderSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER);

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("Program linking error: " + gl.getProgramInfoLog(program));
    }

    const positionLocation = gl.getAttribLocation(program, "a_position");
    const uTimeLocation = gl.getUniformLocation(program, "u_time");
    const uTextureLocation = gl.getUniformLocation(program, "u_texture");

    const vertices = new Float32Array([
        -1.0, -1.0,
        1.0, -1.0,
        -1.0,  1.0,
        -1.0,  1.0,
        1.0, -1.0,
        1.0,  1.0
    ]);

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    loadImageAsync('resources/bg.png')
        .then(img => {
            const texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);

            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

            gl.useProgram(program);

            gl.enableVertexAttribArray(positionLocation);
            gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

            animate();
        })
        .catch(err => {
            console.error("Slika nije lodana", err);
        });

    let time = 0;
    function animate() {
        time += 0.002;

        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.uniform1f(uTimeLocation, time);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, gl.getParameter(gl.TEXTURE_BINDING_2D)); 
        gl.uniform1i(uTextureLocation, 0); 
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        requestAnimationFrame(animate);
    }
};
