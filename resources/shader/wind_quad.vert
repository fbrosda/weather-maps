precision mediump float;

attribute vec2 a_pos;

varying vec2 v_tex_pos;

void main() {
    v_tex_pos = a_pos;
    /* gl_Position = u_matrix * vec4(a_pos, 0, 1); */
    gl_Position = vec4(1.0 - 2.0 * a_pos, 0, 1);
}
