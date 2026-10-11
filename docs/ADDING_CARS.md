# Adding cars to APEX TYPE

The game, garage, unlocks, and multiplayer server all read **public/cars.json**. New cars require a model, a preview, and one catalog entry. You do not need to add UI components or change the race rules.

1. Obtain a licensed GLB car asset and retain its author, source URL, and license. Use a finished model with its textures embedded.
2. Normalize it to six world units long, center it on X/Z, and put its lowest point at Y=0. Its nose should face +Z. A Blender helper is included:

   ```sh
   blender -b -P scripts/prepare-car.py -- originals/my-classic.glb public/assets/cars/my-classic.glb
   ```

   The helper centers and scales the asset and aligns its longest horizontal axis. Inspect its front direction in Chase view. Set `rotationY` to `3.141592653589793` if it faces backward.

3. Add a production preview image at `public/assets/cars/my-classic.webp`. Render the model or use an appropriately licensed preview from the asset creator.
4. Append an entry to `public/cars.json`:

   ```json
   {
     "id": "my-classic",
     "name": "My Classic",
     "subtitle": "THE NEXT COLLECTIBLE",
     "model": "assets/cars/my-classic.glb",
     "preview": "assets/cars/my-classic.webp",
     "unlockRaces": 25,
     "rotationY": 0,
     "author": "Model creator",
     "source": "https://example.com/the-original-asset",
     "license": "The asset's actual license",
     "licenseUrl": "https://example.com/the-actual-license"
   }
   ```

   IDs must be unique. Paths are relative to `public/`. `unlockRaces: 0` makes a car available immediately. Other values count completed laps on that device. Cars are cosmetic: all speed and progress come from typing.

5. Add any license text or attribution requirements to `docs/ASSETS.md` and `public/assets/cars/CREDITS.json`. The garage shows catalog author/source/license information; set `licenseUrl` to the actual license document.
6. Run `npm test` and `npm run build`. Test selection in the garage, Chase and Circuit cameras, and two multiplayer clients. Commit, push, and redeploy the updated Worker.

Existing catalog IDs must remain stable because player selections and multiplayer room records store them. The renderer caches models and replaces each participant's visual independently. The server validates choices against the catalog; adding an entry makes the ID available to the server automatically after rebuilding.
