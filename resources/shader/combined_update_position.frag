precision highp float;

uniform sampler2D u_particles;
uniform sampler2D u_colors;

uniform sampler2D u_wind;
uniform vec2 u_wind_res;
uniform vec2 u_wind_min;
uniform vec2 u_wind_max;

uniform sampler2D u_previous;
uniform vec2 u_previous_res;
uniform vec2 u_previous_min;
uniform vec2 u_previous_max;

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

// wind speed lookup; use manual bilinear filtering based on 4 adjacent pixels for smooth interpolation
vec2 lookup_wind(const sampler2D u_texture, const vec2 res, const vec2 uv) {
    // return texture2D(u_texture, uv).rg; // lower-res hardware filtering
    vec2 px = 1.0 / res;
    vec2 vc = (floor(uv * res)) * px;
    vec2 f = fract(uv * res);
    vec2 tl = texture2D(u_texture, vc).rg;
    vec2 tr = texture2D(u_texture, vc + vec2(px.x, 0)).rg;
    vec2 bl = texture2D(u_texture, vc + vec2(0, px.y)).rg;
    vec2 br = texture2D(u_texture, vc + px).rg;
    return mix(mix(tl, tr, f.x), mix(bl, br, f.x), f.y);
}

void main() {
    vec4 color = texture2D(u_particles, v_tex_pos);
    vec2 pos = vec2(
        color.r / 255.0 + color.b,
        color.g / 255.0 + color.a); // decode particle position from pixel RGBA

    vec4 particleColor = texture2D(u_colors, v_tex_pos);

    vec2 velocity = mix(u_wind_min, u_wind_max, lookup_wind(u_wind, u_wind_res, pos));
    float speed_t = length(velocity) / length(u_wind_max);

    vec2 velocity_prev = mix(u_previous_min, u_previous_max, lookup_wind(u_previous, u_previous_res, pos));
    float speed_t_prev = length(velocity_prev) / length(u_previous_max);

    velocity = mix(velocity, velocity_prev, u_velocity);
    speed_t = mix(speed_t, speed_t_prev, u_velocity);

    // take EPSG:4236 distortion into account for calculating where the particle moved
    float distortion = cos(radians(pos.y * 180.0 - 90.0));
    vec2 offset = vec2(velocity.x / distortion, -velocity.y) * 0.001 * u_speed_factor;

    if( particleColor.a < 0.01 ) {
        vec2 seed = v_tex_pos * vec2(1.5 - u_rand_seed, u_rand_seed);
        vec2 random_pos = vec2(
                rand(seed + 1.3),
                rand(seed + 2.1));
        pos = u_nw + (random_pos * (u_se - u_nw));
    } else {
        pos = fract(1.0 + pos + offset);
    }

    // encode the new particle position back into RGBA
    gl_FragColor = vec4(
        fract(pos * 255.0),
        floor(pos * 255.0) / 255.0);
}
