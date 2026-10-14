#version 330 core

uniform vec2 iResolution;               /* screen resolution, value passed from CPU */
uniform float iTime;                    /* current time, value passed from CPU */
uniform int iFrame;                     /* current frame, value passed from CPU */
in vec2 fragCoord;                      /* fragment shader input: fragment coordinates, valued passed from vertex shader */
out vec4 fragColor;                     /* fragment shader output: fragment color, value passed to pixel processing for screen display */

const float M_PI = 3.1415926535;                        /* const value for PI */
const vec3 BG_COLOR = vec3(184, 243, 255) / 255.;       /* const value for background color */

//// This function converts from Polar Coordinates to Cartesian coordinates

vec2 polar2cart(float angle, float length)
{
    return vec2(cos(angle) * length, sin(angle) * length);
}

//// This is a sample function showing you how to check if a point is inside a triangle

bool inTriangle(vec2 p, vec2 p1, vec2 p2, vec2 p3)
{
    if(dot(cross(vec3(p2 - p1, 0), vec3(p - p1, 0)), cross(vec3(p2 - p1, 0), vec3(p3 - p1, 0))) >= 0. &&
        dot(cross(vec3(p3 - p2, 0), vec3(p - p2, 0)), cross(vec3(p3 - p2, 0), vec3(p1 - p2, 0))) >= 0. &&
        dot(cross(vec3(p1 - p3, 0), vec3(p - p3, 0)), cross(vec3(p1 - p3, 0), vec3(p2 - p3, 0))) >= 0.){
        return true;
    }
    return false;
}

//// This is a sample function showing you how to draw a rotated triangle 
//// Time is specified with iTime

vec3 drawTriangle(vec2 pos, vec2 center, vec3 color)
{
    vec2 p1 = polar2cart(iTime * 2, 160.) + center;
    vec2 p2 = polar2cart(iTime * 2 + 2. * M_PI / 3., 160.) + center;
    vec2 p3 = polar2cart(iTime * 2 + 4. * M_PI / 3., 160.) + center;
    if(inTriangle(pos, p1, p2, p3)){
        return color;
    }
    return vec3(0);
}


/////////////////////////////////////////////////////
//// Step 1 Function: Inside Circle
//// In this function, you will implement a function to checks if a point is inside a circle
//// The inputs include the point position, the circle's center and radius
//// The output is a bool indicating if the point is inside the circle (true) or not (false)
/////////////////////////////////////////////////////
//// Implementation hint: use dot(v,v) to calculate the squared length of a vector v
/////////////////////////////////////////////////////
bool inCircle(vec2 pos, vec2 center, float radius)
{
    vec2 difference = pos - center;

    return dot(difference, difference) <= radius * radius;
}

//// This function calls the inCircle function you implemented above and returns the color of the circle
//// If the point is outside the circle, it returns a zero vector by default
vec3 drawCircle(vec2 pos, vec2 center, float radius, vec3 color)
{
    if(inCircle(pos, center, radius)){
        return color;
    }
    return vec3(0);
}

/////////////////////////////////////////////////////
//// Step 2 Function: Inside Rectangle
//// In this function, you will implement a function to checks if a point is inside a rectangle
//// The inputs include the point position, the left bottom corner and the right top corner of the rectangle
//// The output is a bool indicating if the point is inside the rectangle (true) or not (false)
/////////////////////////////////////////////////////
//// Implementation hint: use .x and .y to access the x and y components of a vec2 variable
/////////////////////////////////////////////////////

bool inRectangle(vec2 pos, vec2 leftBottom, vec2 rightTop)
{
    return pos.x >= leftBottom.x &&
           pos.x <= rightTop.x &&
           pos.y >= leftBottom.y &&
           pos.y <= rightTop.y;
}

//// This function calls the inRectangle function you implemented above and returns the color of the rectangle
//// If the point is outside the rectangle, it returns a zero vector by default

vec3 drawRectangle(vec2 pos, vec2 leftBottom, vec2 rightTop, vec3 color)
{
    if(inRectangle(pos,leftBottom,rightTop)){
        return color;
    }
    return vec3(0);
}

//// This function draws objects on the canvas by specifying a fragColor for each fragCoord

/*void mainImage(in vec2 fragCoord, out vec4 fragColor)
{
    //// Get the window center
    vec2 center = vec2(iResolution / 2.);

    //// By default we draw an animated triangle 
    vec3 fragOutput = drawTriangle(fragCoord, center, vec3(1.0));
    
    //// Step 1: Uncomment this line to draw a circle
    //fragOutput = drawCircle(fragCoord, center, 250, vec3(1.0));

    
    //// Step 2: Uncomment this line to draw a rectangle 
    //fragOutput = drawRectangle(fragCoord, center - vec2(500, 50), center + vec2(500, 50), vec3(1.0));


    //// Step 3: Uncomment this line to draw an animated circle with a temporally varying radius controlled by a sine function
    //fragOutput = drawCircle(fragCoord, center, 150 + 50. * sin(iTime * 10), vec3(1.0));

    //// Step 4: Uncomment this line to draw a union of the rectangle and the animated circle you have drawn previously
    //fragOutput = drawRectangle(fragCoord, center - vec2(500, 50), center + vec2(500, 50), vec3(1.0)) + drawCircle(fragCoord, center, 150 + 50. * sin(iTime * 10), vec3(1.0));

    //// Set the fragment color to be the background color if it is zero
    if(fragOutput == vec3(0)){
        fragColor = vec4(BG_COLOR, 1.0);
    }
    //// Otherwise set the fragment color to be the color calculated in fragOutput
    else{
        fragColor = vec4(fragOutput, 1.0);
    }

    //// Step 5: Implement your customized scene by modifying the mainImage function
    //// Try to leverage what you have learned from Step 1 to 4 to define the shape and color of a new object in the fragment shader
    //// Notice how we put multiple objects together by adding their color values
}*/


void mainImage(in vec2 fragCoord, out vec4 fragColor)
{
    // Background color
    vec3 fragOutput = BG_COLOR;

    // Animation
    float movement = sin(iTime * 2.0) * 20.0;

    // Mask positions
    vec2 comedyCenter = vec2(400.0, 480.0 + movement);
    vec2 tragedyCenter = vec2(880.0, 480.0 - movement);

    // Mask colors
    vec3 comedyColor = vec3(1.0, 0.8, 0.2);
    vec3 tragedyColor = vec3(0.7, 0.7, 0.9);

    // MASK BASES

    if(inCircle(fragCoord, comedyCenter, 180.0))
    {
        fragOutput = comedyColor;
    }

    if(inCircle(fragCoord, tragedyCenter, 180.0))
    {
        fragOutput = tragedyColor;
    }


    // COMEDY MASK EYES

    if(inCircle(fragCoord,
        comedyCenter + vec2(-60.0, 50.0), 25.0))
    {
        fragOutput = vec3(0.0);
    }

    if(inCircle(fragCoord,
        comedyCenter + vec2(60.0, 50.0), 25.0))
    {
        fragOutput = vec3(0.0);
    }


    // COMEDY MASK SMILE

    // Draw dark mouth
    if(inCircle(fragCoord,
        comedyCenter + vec2(0.0, -45.0), 70.0))
    {
        fragOutput = vec3(0.0);
    }

    // Cover the top portion to make it look like a smile
    if(inCircle(fragCoord,
        comedyCenter + vec2(0.0, -15.0), 65.0))
    {
        fragOutput = comedyColor;
    }


    // TRAGEDY MASK EYES

    if(inCircle(fragCoord,
        tragedyCenter + vec2(-60.0, 50.0), 25.0))
    {
        fragOutput = vec3(0.0);
    }

    if(inCircle(fragCoord,
        tragedyCenter + vec2(60.0, 50.0), 25.0))
    {
        fragOutput = vec3(0.0);
    }


    // TRAGEDY MASK SAD MOUTH

    // Dark circle
    if(inCircle(fragCoord,
        tragedyCenter + vec2(0.0, -80.0), 70.0))
    {
        fragOutput = vec3(0.0);
    }

    // Cover the bottom to create a sad mouth shape
    if(inCircle(fragCoord,
        tragedyCenter + vec2(0.0, -110.0), 65.0))
    {
        fragOutput = tragedyColor;
    }


    // Output final color
    fragColor = vec4(fragOutput, 1.0);
}

void main()
{
    mainImage(fragCoord, fragColor);
}


