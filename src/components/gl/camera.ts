/** Champ de vision fixe : à z = 0, une unité WebGL = un pixel CSS */
export const FOV = 30;
export const cameraZ = (vh: number) => vh / 2 / Math.tan((FOV * Math.PI) / 360);
