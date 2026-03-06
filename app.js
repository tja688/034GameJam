const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#222222',
    physics: {
        default: 'arcade',
        arcade: {
            debug: false,
            gravity: { y: 0 }
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

function preload() {
    // No external assets required, we use basic Phaser shapes
}

let shapesGroup;

function create() {
    // Set world bounds to canvas edges
    this.physics.world.setBoundsCollision(true, true, true, true);

    shapesGroup = this.physics.add.group({
        bounceX: 1, // Perfectly bouncy
        bounceY: 1,
        collideWorldBounds: true
    });

    const numObjects = 60; // How many scattered shapes
    // A palette of nice vibrant colors
    const colors = [0xff3333, 0x33ff33, 0x3333ff, 0xffff33, 0xff33ff, 0x33ffff, 0xffffff, 0xff8833];

    for (let i = 0; i < numObjects; i++) {
        // Random locations within the screen
        const x = Phaser.Math.Between(50, config.width - 50);
        const y = Phaser.Math.Between(50, config.height - 50);
        
        // Random shape type: 0 = Rectangle, 1 = Circle, 2 = Triangle
        const type = Phaser.Math.Between(0, 2);
        
        const color = Phaser.Math.RND.pick(colors);
        const size = Phaser.Math.Between(20, 60);

        let shape;

        if (type === 0) {
            // Rectangle / Square
            shape = this.add.rectangle(x, y, size, size, color);
            this.physics.add.existing(shape);
        } else if (type === 1) {
            // Circle
            shape = this.add.circle(x, y, size/2, color);
            this.physics.add.existing(shape);
            shape.body.setCircle(size/2); // use circular body
        } else {
            // Triangle
            // Draw an equilateral-ish triangle (0, size), (size/2, 0), (size, size)
            shape = this.add.triangle(x, y, 0, size, size/2, 0, size, size, color);
            this.physics.add.existing(shape);
            shape.body.setSize(size, size);
        }

        shapesGroup.add(shape);

        // Assign random initial velocity (-150 to 150), ensure it isn't zero
        let speedX = Phaser.Math.Between(-150, 150);
        let speedY = Phaser.Math.Between(-150, 150);
        if (speedX === 0) speedX = 50;
        if (speedY === 0) speedY = 50;

        shape.body.setVelocity(speedX, speedY);

        // Store custom property for rotation logic
        shape.shapeType = type;
        shape.rotSpeed = Phaser.Math.FloatBetween(-3, 3);
    }

    // Enable collisions between all shapes
    this.physics.add.collider(shapesGroup, shapesGroup);

    // Responsive generic resizing
    window.addEventListener('resize', () => {
        game.scale.resize(window.innerWidth, window.innerHeight);
        this.physics.world.setBounds(0, 0, window.innerWidth, window.innerHeight);
    });
}

function update() {
    // Add visual rotation for squares and triangles based on their random rotSpeed property
    // Arcade physics uses Axis-Aligned Bounding Boxes (AABB) that won't visually rotate,
    // so this is just a visual effect!
    shapesGroup.getChildren().forEach(shape => {
        if (shape.shapeType !== 1) { // 1 is Circle, skip rotating circles since they're uniform
            shape.angle += shape.rotSpeed;
        }
    });
}
