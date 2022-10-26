var canvas;
var gl;

var program;

var near = -100;
var far = 100;


var left = -6.0;
var right = 6.0;
var ytop = 6.0;
var bottom = -6.0;


var lightPosition2 = vec4(100.0, 100.0, 100.0, 1.0);
var lightPosition = vec4(0.0, 0.0, 100.0, 1.0);

var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0);
var lightDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
var lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);

var materialAmbient = vec4(1.0, 0.0, 1.0, 1.0);
var materialDiffuse = vec4(1.0, 0.8, 0.0, 1.0);
var materialSpecular = vec4(0.4, 0.4, 0.4, 1.0);
var materialShininess = 30.0;

var ambientColor, diffuseColor, specularColor;

var modelMatrix, viewMatrix, modelViewMatrix, projectionMatrix, normalMatrix;
var modelViewMatrixLoc, projectionMatrixLoc, normalMatrixLoc;
var eye;
var at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);

var RX = 0;
var RY = 0;
var RZ = 0;

var MS = []; // The modeling matrix stack
var TIME = 0.0; // Realtime
var prevTime = 0.0;
var resetTimerFlag = true;
var animFlag = false;

// Used to store array of bubble objects (x, y, z, time)
var ArrayB = [];
// Time that the last 4-5 set of bubbles were created
var timer = 0;
// Array of time for the set of 4-5 bubbles
var startTime = [];


function setColor(c) {
    ambientProduct = mult(lightAmbient, c);
    diffuseProduct = mult(lightDiffuse, c);
    specularProduct = mult(lightSpecular, materialSpecular);

    gl.uniform4fv(gl.getUniformLocation(program,
        "ambientProduct"), flatten(ambientProduct));
    gl.uniform4fv(gl.getUniformLocation(program,
        "diffuseProduct"), flatten(diffuseProduct));
    gl.uniform4fv(gl.getUniformLocation(program,
        "specularProduct"), flatten(specularProduct));
    gl.uniform4fv(gl.getUniformLocation(program,
        "lightPosition"), flatten(lightPosition));
    gl.uniform1f(gl.getUniformLocation(program,
        "shininess"), materialShininess);
}

window.onload = function init() {

    canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL isn't available");
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.5, 0.5, 1.0, 1.0);

    gl.enable(gl.DEPTH_TEST);

    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);


    setColor(materialDiffuse);

    Cube.init(program);
    Cylinder.init(9, program);
    Cone.init(9, program);
    Sphere.init(36, program);


    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
    normalMatrixLoc = gl.getUniformLocation(program, "normalMatrix");
    projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");


    gl.uniform4fv(gl.getUniformLocation(program,
        "ambientProduct"), flatten(ambientProduct));
    gl.uniform4fv(gl.getUniformLocation(program,
        "diffuseProduct"), flatten(diffuseProduct));
    gl.uniform4fv(gl.getUniformLocation(program,
        "specularProduct"), flatten(specularProduct));
    gl.uniform4fv(gl.getUniformLocation(program,
        "lightPosition"), flatten(lightPosition));
    gl.uniform1f(gl.getUniformLocation(program,
        "shininess"), materialShininess);


    document.getElementById("sliderXi").onchange = function () {
        RX = this.value;
        window.requestAnimFrame(render);
    };
    document.getElementById("sliderYi").onchange = function () {
        RY = this.value;
        window.requestAnimFrame(render);
    };
    document.getElementById("sliderZi").onchange = function () {
        RZ = this.value;
        window.requestAnimFrame(render);
    };
    document.getElementById("animToggleButton").onclick = function () {
        if (animFlag) {
            animFlag = false;
        } else {
            animFlag = true;
            resetTimerFlag = true;
            window.requestAnimFrame(render);
        }
        console.log(animFlag);
    };


    render();
};

// Sets the modelview and normal matrix in the shaders
function setMV() {
    modelViewMatrix = mult(viewMatrix, modelMatrix);
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
    normalMatrix = inverseTranspose(modelViewMatrix);
    gl.uniformMatrix4fv(normalMatrixLoc, false, flatten(normalMatrix));
}

// Sets the projection, modelview and normal matrix in the shaders
function setAllMatrices() {
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));
    setMV();

}

// Draws a 2x2x2 cube center at the origin
// Sets the modelview matrix and the normal matrix of the global program
function drawCube() {
    setMV();
    Cube.draw();
}

// Draws a sphere centered at the origin of radius 1.0.
// Sets the modelview matrix and the normal matrix of the global program
function drawSphere() {
    setMV();
    Sphere.draw();
}

// Draws a cylinder along z of height 1 centered at the origin
// and radius 0.5.
// Sets the modelview matrix and the normal matrix of the global program
function drawCylinder() {
    setMV();
    Cylinder.draw();
}

// Draws a cone along z of height 1 centered at the origin
// and base radius 1.0.
// Sets the modelview matrix and the normal matrix of the global program
function drawCone() {
    setMV();
    Cone.draw();
}

// Post multiples the modelview matrix with a translation matrix
// and replaces the modeling matrix with the result
function gTranslate(x, y, z) {
    modelMatrix = mult(modelMatrix, translate([x, y, z]));
}

// Post multiples the modelview matrix with a rotation matrix
// and replaces the modeling matrix with the result
function gRotate(theta, x, y, z) {
    modelMatrix = mult(modelMatrix, rotate(theta, [x, y, z]));
}

// Post multiples the modelview matrix with a scaling matrix
// and replaces the modeling matrix with the result
function gScale(sx, sy, sz) {
    modelMatrix = mult(modelMatrix, scale(sx, sy, sz));
}

// Pops MS and stores the result as the current modelMatrix
function gPop() {
    modelMatrix = MS.pop();
}

// pushes the current modelViewMatrix in the stack MS
function gPush() {
    MS.push(modelMatrix);
}


function render() {

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    eye = vec3(0, 0, 10);
    MS = []; // Initialize modeling matrix stack

    modelMatrix = mat4();

    // set the camera matrix
    viewMatrix = lookAt(eye, at, up);

    // set the projection matrix
    projectionMatrix = ortho(left, right, bottom, ytop, near, far);


    gRotate(RZ, 0, 0, 1);
    gRotate(RY, 0, 1, 0);
    gRotate(RX, 1, 0, 0);


    setAllMatrices();

    var curTime;
    if (animFlag) {
        curTime = (new Date()).getTime() / 1000;
        if (resetTimerFlag) {
            prevTime = curTime;
            resetTimerFlag = false;
        }
        TIME = TIME + curTime - prevTime;
        prevTime = curTime;
    }

  //  gTranslate(-4,0,0) ;
  //  gPush() ;
  //  {
  //      setColor(vec4(1.0,0.0,0.0,1.0)) ;
  //      drawSphere() ;
  //  }
  //  gPop() ;
  //
  //  gPush() ;
  //  {
  //      gTranslate(3,0,0) ;
  //      setColor(vec4(0.0,1.0,0.0,1.0)) ;
  //      gRotate(TIME*180/3.14159,0,1,0) ;
  //      drawCube() ;
  //  }
  //  gPop() ;
  //
  //  gPush() ;
  //  {
  //      gTranslate(5,0,0) ;
  //      setColor(vec4(0.0,0.0,1.0,1.0)) ;
  //      gRotate(TIME*180/3.14159,0,1,0) ;
  //      drawCylinder() ;
  //  }
  //  gPop() ;
  //
  //  gPush() ;
  //  {
  //      gTranslate(7,0,0) ;
  //      setColor(vec4(1.0,1.0,0.0,1.0)) ;
  //      gRotate(TIME*180/3.14159,0,1,0) ;
  //      drawCone() ;
  //  }
  //  gPop() ;
  //

    //Create ground box
    gPush();
    {
      gTranslate(0, -5.5, 0); //move down -5.5
      gScale(100, 1, 1); //scale to 100 on x
      setColor(vec4(0.0, 0.0, 0.0, 1.0)); //set colour to black
      drawCube(); //create cube
    }
    gPop();
    //Create first rock
    gPush();
    {
      gTranslate(0, -3.9, 0); //move down
      gScale(0.6, 0.6, 0.6); //make bigger
      setColor(vec4(0.29, 0.29, 0.29, 1.0)); //set colour to grey
      drawSphere();
    }
    gPop();
    //Create second rock
    gPush();
    {
      gTranslate(-1.1, -4.15, 0); //move left and down
      gScale(0.35, 0.35, 0.35); //make bigger
      setColor(vec4(0.29, 0.29, 0.29, 1.0));//set colour to grey
      drawSphere();
    }
    gPop();

    // Seaweed
    // create array of (x, y ,z) coordinates for bases of the seaweed
    var seaweedLocations = [
        [-0.62, -4.1, 0], //left
        [0, -3.6, 0], //middle
        [0.62, -4.1, 0] //right
    ];

    // Iterates through seaweedLocations and make seaweed bases
    var j;
    for (j = 0; j < seaweedLocations.length; j++) {
        createSeaweed(seaweedLocations[j][0], seaweedLocations[j][1], seaweedLocations[j][2])
    }
    // Seaweed

    // Fish
    gPush();
    {
        //Rotates and translates the fish
        //is tangent to the circle
        gRotate(TIME * 120 / 3.14159, 0, -1, 0);
        gScale(-1, 1, 1);
        gTranslate(0, -6.5 + 0.04 * Math.sin(TIME / 0.9) * 45 / 3.14159, 0);
        gPush();
        {
            gTranslate(4, 4, 0);

            //Body of the fish
            gPush();
            {
                gScale(0.4, 0.4, 2); //scale cone
                setColor(vec4(0.7, 0.1, 0.1, 1.0)); //make a red ish colour
                drawCone();
            }
            gPop();

            //Face of the fish
            gPush();
            {
                gTranslate(0, 0, -1.25);
                gScale(0.4, 0.4, -0.5);
                setColor(vec4(0.6, 0.6, 0.6, 1.0)); //light grey colour
                drawCone();
            }
            gPop();

            //Tail
            gPush();
            {
                // Tail movement
                gTranslate(0, 0, 1);
                gRotate(Math.sin(TIME / 0.1) * 90 / 3.14159, 0, 1, 0);

                //Top
                gPush();
                {
                    gTranslate(0, 0.30, 0.25);
                    gRotate(-45, 1, 0, 0);
                    gScale(0.18, 0.18, 0.9);
                    setColor(vec4(0.7, 0.1, 0.1, 1.0));//make a red ish colour
                    drawCone();
                }
                gPop();

                //Bottom
                gPush();
                {
                    gTranslate(0, -0.17, 0.1);
                    gRotate(45, 1, 0, 0);
                    gScale(0.18, 0.18, 0.5);
                    setColor(vec4(0.7, 0.1, 0.1, 1.0));//make a red ish colour
                    drawCone();
                }
                gPop();
            }
            gPop();

            //Eyes
            gPush();
            {
                gTranslate(0.2, 0.15, -1.2);
                gScale(0.09, 0.09, 0.09);
                setColor(vec4(1.0, 1.0, 1.0, 1.0)); //make black
                drawSphere();
            }
            gPop();
            gPush();
            {
                gTranslate(-0.2, 0.15, -1.2);
                gScale(0.09, 0.09, 0.09);
                setColor(vec4(1.0, 1.0, 1.0, 1.0));//make black
                drawSphere();
            }
            gPop();
            gPush();
            {
                gTranslate(0.2, 0.15, -1.27);
                gScale(0.035, 0.035, 0.035);
                setColor(vec4(0.0, 0.0, 0.0, 0.0));//make white
                drawSphere();
            }
            gPop();
            gPush();
            {
                gTranslate(-0.2, 0.15, -1.27);
                gScale(0.035, 0.035, 0.035);
                setColor(vec4(0.0, 0.0, 0.0, 0.0));//make white
                drawSphere();
            }
            gPop();

        }
        gPop();
    }
    gPop();


    //Diver
    gPush();
    {
        //Diver movement in x and y
        gTranslate(3 + Math.sin(TIME / 2), 3 + Math.sin(TIME / 2), 0);
        gRotate(20, 0, -1, 0);
        //Head
        gPush();
        {
            gScale(0.4, 0.4, 0.4);
            setColor(vec4(0.5, 0.01, 0.5, 1.0));//set purple ish
            drawSphere();
        }
        gPop();

        //Bubble tracker
                //Creates 4-5 bubbles over 2.4 - 3.0 second period every 4 seconds
                if ((TIME - timer) > 6.4 || timer === 0) {

                    // Random bubble counter of 4 to 5 bubbles
                    var AddBubble = Math.floor(Math.random() * Math.floor(2)) + 3;
                    startTime.push(Math.round(TIME));

                    //Tracks start time of each bubble
                    for (; AddBubble >= 1; AddBubble--) {
                        var time = Math.round(TIME) + AddBubble * 0.6;
                        startTime.push(time);
                    }
                    timer = TIME;
                }

                //checks start time and removes bubble after a certain time
                var b;
                for (b = 0; b < startTime.length; b++) {
                    if (startTime[b] < TIME) {
                        ArrayB.push([3 + Math.sin(TIME / 2), 3 + Math.sin(TIME / 2), 0.5, TIME]);
                        startTime.splice(b, 1);
                        b--;
                    }
                }


        // Torso
                gPush();
                {
                    gTranslate(0, -1.5, 0);
                    gScale(0.9, 1.1, 0.4);
                    setColor(vec4(0.5, 0.01, 0.5, 1.0)); //make a purple ish colour
                    drawCube()
                }
                gPop();
                // Legs
                gPush();
                {
                    gTranslate(0, -3.2, 0);
                    setColor(vec4(0.5, 0.01, 0.5, 1.0));//make a purple ish colour

                    //Right Leg
                    gPush();
                    {
                        // Legs kick with sin function
                        gTranslate(-0.5, 0.4, -0.2);
                        gRotate(-(Math.sin(TIME) * 25) + 32.5, 1, 0, 0);

                        // Thigh
                        gPush();
                        {
                            gScale(0.2, 0.5, 0.2);
                            drawCube();
                        }
                        gPop();

                        // Shin
                        gTranslate(0, -1.05, -0.3);
                        gRotate(25, 1, 0, 0);

                        gPush();
                        {
                            gScale(0.2, 0.6, 0.2);
                            drawCube();
                        }
                        gPop();

                        // Foot
                        gTranslate(0, -0.6, 0.4);

                        gPush();
                        {
                            gScale(0.2, 0.1, 0.6);
                            drawCube();
                        }
                        gPop();
                    }
                    gPop();

                    //Left Leg
                    gPush();
                    {

                        gTranslate(0.5, 0.4, -0.2);
                        gRotate((Math.sin(TIME) * 25) + 32.5, 1, 0, 0);

                        // Thigh
                        gPush();
                        {
                            gScale(0.2, 0.5, 0.2);
                            drawCube();
                        }
                        gPop();

                        // Shin
                        gTranslate(0, -1.05, -0.3);
                        gRotate(25, 1, 0, 0);

                        gPush();
                        {
                            gScale(0.2, 0.6, 0.2);
                            drawCube();
                        }
                        gPop();

                        // Foot
                        gTranslate(0, -0.6, 0.4);

                        gPush();
                        {
                            gScale(0.2, 0.1, 0.6);
                            drawCube();
                        }
                        gPop();
          }
          gPop();
        }
        gPop();
      }
      gPop();

      // Bubbles
          // Draws bubbles
          var count;
          for (count = 0; count < ArrayB.length; count++) {

              //Removes bubbles/ deletes bubbles
              if (Math.round(TIME - ArrayB[count][3]) > 12) {
                  ArrayB.splice(count, 1);
                  count--;
              } else {
                  ArrayB[count][1] += 0.015;
                  createBubble(ArrayB[count][0], ArrayB[count][1], ArrayB[count][2]);
              }
          }

    if( animFlag )
        window.requestAnimFrame(render);
}

// Draw seaweed function
function createSeaweed(x, y, z) {
    gPush();
    {
        gTranslate(x, y, z);

        // Draws 10 seaweed links
        var i;
        for (i = 0; i < 10; i++) {
            gTranslate(0, 0.5, 0); //space them 0.5 units apart

            // Seaweed animation
            gRotate((1 / 3) * Math.sin(TIME + i) * 90 / 3.14159, 0, 0, 1);

            gPush();
            {
                gScale(0.13, 0.28, 0.13); //scale each Sphere
                setColor(vec4(0.0, 1.0, 0.0, 1.0)); //make it green
                drawSphere(); //create link
            }
            gPop();
        }
    }
    gPop();
}

// Draws individual bubbles
function createBubble(x, y, z) {
    gPush();
    {
        // Bubbles oscillate with time
        gTranslate(x, y, z);
        gRotate((TIME % 360) * 100, 5, 5, 5);
        gScale(0.2, 0.24, 0.2);
        setColor(vec4(1.0, 1.0, 1.0, 1.0));//Makes it white
        drawSphere()
    }
    gPop();
}
