# Setting up Animations with Framer Motion

To enable the animations in the Dashboard, you need to install Framer Motion, a popular React animation library.

## Installation

Run the following command in your project's root directory:

```bash
npm install framer-motion
```

or if you're using yarn:

```bash
yarn add framer-motion
```

## What's Included

The animations added to the Dashboard include:

1. **Fade and slide animations** for the hero section
2. **Staggered animations** for lists of items
3. **Hover animations** for interactive elements
4. **Spring physics** for natural movement
5. **Loading spinner** animations
6. **Scale transitions** for cards and buttons

## Usage in Other Components

You can reuse these animation patterns in other components by:

1. Importing the motion components:
   ```javascript
   import { motion } from 'framer-motion';
   ```

2. Using motion components instead of regular HTML elements:
   ```javascript
   <motion.div 
     initial={{ opacity: 0 }}
     animate={{ opacity: 1 }}
     transition={{ duration: 0.5 }}
   >
     Content here
   </motion.div>
   ```

3. Adding hover/tap animations:
   ```javascript
   <motion.button
     whileHover={{ scale: 1.05 }}
     whileTap={{ scale: 0.95 }}
   >
     Click me
   </motion.button>
   ```

Refer to the [Framer Motion documentation](https://www.framer.com/motion/) for more animation options.
