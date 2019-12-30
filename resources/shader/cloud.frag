precision highp float;

uniform sampler2D u_cloud;
varying vec2 v_tex_pos;

float normalize(float x, float min, float max) {
    return (x - min) / (max - min);
}

void main() {
    vec4 data = texture2D(u_cloud, v_tex_pos);
    if( data.z > 0.5 ) {
        float probability = normalize(data.z, 0.5, 1.0);
        gl_FragColor = vec4(mix(vec3(0.9, 0.7, 0.8), vec3(0.6, 0.1, 0.4), probability), 0.2);
    } else if(data.y > 0.4) {
        float amount = normalize(data.y, 0.4, 1.0);
        gl_FragColor = vec4(mix(vec3(0.7, 0.8, 0.9), vec3(0.3, 0.5, 0.7), amount), 0.2);
    } else if(data.x > 0.0) {
        gl_FragColor = vec4(data.x);
    } else {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
    }
}
