precision mediump float;

attribute float a_index;

uniform sampler2D u_particles;
uniform sampler2D u_particle_colors;
uniform float u_particles_res;
uniform mat4 u_matrix;

varying vec4 v_particle_color;

void main() {
    vec4 color = texture2D(u_particles, vec2(
        fract(a_index / u_particles_res),
        floor(a_index / u_particles_res) / u_particles_res));

    // decode current particle position from the pixel's RGBA value
    vec2 particle_pos = vec2(
        color.r / 255.0 + color.b,
        color.g / 255.0 + color.a);

    v_particle_color = texture2D(u_particle_colors, vec2(
        fract(a_index / u_particles_res),
        floor(a_index / u_particles_res) / u_particles_res));

    gl_PointSize = 2.0;
    gl_Position = u_matrix * vec4(particle_pos, 0.0, 1.0);
}
