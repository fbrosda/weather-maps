precision highp float;

uniform sampler2D u_particles;
uniform sampler2D u_colors;

uniform sampler2D u_clouds;
uniform vec2 u_cloud_res;

uniform sampler2D u_previous;
uniform vec2 u_previous_res;

uniform float u_velocity;

uniform vec2 u_nw;
uniform vec2 u_se;
uniform float u_rand_seed;
uniform float u_speed_factor;
uniform float u_drop_rate;

varying vec2 v_tex_pos;

// pseudo-random generator
const vec3 rand_constants = vec3(12.9898, 78.233, 4375.85453);
float rand(const vec2 co) {
    float t = dot(rand_constants.xy, co);
    return fract(sin(t) * (rand_constants.z + t));
}

float normalize(float x, float min, float max) {
    return (x - min) / (max - min);
}

vec4 lookup(const sampler2D u_texture, const vec2 res, const vec2 uv) {
    vec2 px = 1.0 / res;
    vec2 vc = (floor(uv * res)) * px;
    vec4 cloudColor = texture2D(u_texture, vc);

    if( cloudColor.z > 0.5 ) {
        float probability = normalize(cloudColor.z, 0.5, 1.0);
        return vec4(mix(vec3(0.9, 0.7, 0.8), vec3(0.6, 0.1, 0.4), probability), 1.0);
    } else if(cloudColor.y > 0.4) {
        float amount = normalize(cloudColor.y, 0.4, 1.0);
        return vec4(mix(vec3(0.7, 0.8, 0.9), vec3(0.3, 0.5, 0.7), amount), 1.0);
    } else if(cloudColor.x > 0.0) {
        return vec4(vec3(cloudColor.x), 1.0);
    } else {
        return vec4(0.0);
    }
}

void main() {
    vec4 posColor = texture2D(u_particles, v_tex_pos);
    vec2 pos = vec2(
        posColor.r / 255.0 + posColor.b,
        posColor.g / 255.0 + posColor.a); // decode particle position from pixel RGBA

    vec4 particleColor = texture2D(u_colors, v_tex_pos);

    vec2 seed = (v_tex_pos + pos) * u_rand_seed;
    float drop = step(1.0 - u_drop_rate, rand(seed));

    vec2 random_pos = vec2(
            rand(seed + 1.3),
            rand(seed + 2.1));
    random_pos = u_nw + (random_pos * (u_se - u_nw));

    if( u_nw.x <= pos.x && u_se.x >= pos.x &&
            u_nw.y <= pos.y && u_se.y >= pos.y ) {
        if( drop > 0.5 ) {
            particleColor = vec4(0.0); //lookup(u_clouds, u_cloud_res, random_pos);
        } else if( particleColor.a < 0.01) {
            particleColor = lookup(u_clouds, u_cloud_res, pos);
        }
    } else {
        particleColor = vec4(0.0); //lookup(u_clouds, u_cloud_res, random_pos);
    }

    // encode the new particle color back into RGBA
    gl_FragColor = particleColor;
}
