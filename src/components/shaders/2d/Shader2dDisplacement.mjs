import * as IMPION from "#impion";

export default class Shader2dDisplacement extends IMPION.ComponentEmpty{

	#app;
	
	filter;	
	
	//------------------------------------------------------------------------
	
	constructor({
		uNoise,
		
		fps = 60,
		order = "",
		orderShader = 0
	}){
		super(fps, order);
		
		this.#app = globalThis.playable;	

		this.filter = IMPION.Filter2d.from({
			gl: {
				vertex: this.vertexShader(),
				fragment: this.fragmentShader()
			},
			resources: {
				displacementUniforms: {
					uTime: {
						value: 0,
						type: "f32"
					}
				},
				uNoise: uNoise.source
			}
		});
    }
	
	//------------------------------------------------------------------------

	vertexShader(){
		return `
            in vec2 aPosition;
            out vec2 vTextureCoord;

            uniform vec4 uInputSize;
            uniform vec4 uOutputFrame;
            uniform vec4 uOutputTexture;

            vec4 filterVertexPosition(void)
            {
                vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
                position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
                position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
                return vec4(position, 0.0, 1.0);
            }

            vec2 filterTextureCoord(void)
            {
                return aPosition * (uOutputFrame.zw * uInputSize.zw);
            }

            void main(void)
            {
                gl_Position = filterVertexPosition();
                vTextureCoord = filterTextureCoord();
            }
		`;
	}
		
	fragmentShader(){
		return `
			in vec2 vTextureCoord;

			out vec4 finalColor;

			uniform sampler2D uTexture;
			uniform sampler2D uNoise;
			uniform float uTime;
			
			void main(void){				
				vec2 uv = vTextureCoord;

				vec4 noiseA = texture(
					uNoise,
					vec2(
						uv.x * 3.0 + uTime * 0.08,
						uv.y * 13.0 + uTime * 0.05
					)
				);

				vec4 noiseB = texture(
					uNoise,
					vec2(
						uv.x * 7.0 - uTime * 0.06,
						uv.y * 17.0 + uTime * 0.04
					)
				);

				float noise = noiseA.r * noiseB.r;

				vec2 offset = vec2(
					noise - 0.5,
					noiseA.g - 0.5
				);

				offset *= 0.012;

				vec2 distortedUV = uv + offset;

				distortedUV = clamp(distortedUV, vec2(0.001), vec2(0.999));

				vec4 originalColor = texture(uTexture, uv);
				vec4 distortedColor = texture(uTexture, distortedUV);

				finalColor = mix(originalColor, distortedColor, 0.65);
			}
		`;
	}
	
	//------------------------------------------------------------------------
	
    enterframe = (timeDelta)=>{	
		if(this.filter?.resources?.displacementUniforms?.uniforms){
			this.filter.resources.displacementUniforms.uniforms.uTime += 0.02 * this.#app.timeScale;		
		}
    }
}