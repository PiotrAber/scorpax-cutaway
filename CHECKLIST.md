# SCORPAX SX-9 — Cutaway Visual Checklist (12 Lines)

Reference image: `scorpax_reference_1795267724313.jpg`
Measured reference metrics:
- Overall bounding box aspect (H / W): `0.798`
- Dark-pixel share (`luma < 80`) in bounding box: `0.0893` (minimum target `>= 0.0715`; foreground dark share `0.2279`)
- Green accent share in bounding box: `0.0162` (strictly sparse lines, rings, bezels, internal coils)
- Warm leftover pixels: `0`

## Checklist (graded `yes` / `partial` / `no` every round against the reference)

1. **Silhouette and hero angle:** Low, wide armored emperor scorpion standing on 8 splayed mechanical legs, two heavy pincers reaching forward `0.68` of trunk length, and a 5-segment tail arcing high overhead to `~1.35` above trunk axis (`H / W ≈ 0.75–0.82`). Front 3/4 view slightly from above, floating/grounded over a soft pooled floor shadow on crisp near-white studio paper.
2. **Signature feature #1 — Glass Venom Bulb & Stinger:** Tail terminates in a crystal-clear refractive glass sphere (`radius ~0.22`) held by a dark machined collar, containing a vivid glowing emerald helical coil running cleanly along its axis, tapering into a curved translucent glass/steel injector stinger tip poised above the dorsal dome. NEVER an opaque white tail tip.
3. **Signature feature #2 — Dorsal Glass Reactor Dome:** Large hemispherical CLEAR refractive glass dome (`transmission: 1`) mounted centrally on the upper back inside a riveted white circular collar, clearly showing 3 large dark metallic meshed spur gears (radius `~0.28–0.32`), shafts, and glowing emerald internal coils right behind the glass. NEVER a solid white hump.
4. **Sculpted Articulated Pincers (Chelae):** Two massive curved glossy-white clearcoat claw palms with twin tapered fingers (fixed upper, hinged lower jaw) on 3-segment dark-servo arms. Razor-thin emerald strips trace the inner serrated clamping edges; dark hydraulic piston and clamping gear teeth show inside the open jaw recess. NEVER blocky mittens or solid cylinders.
5. **Multi-Plate Carapace & Tergites:** Head/prosoma and rear mesosoma built from separate beveled glossy-white curved armor plates in 3 sizes (paired front brow plates, center keystone, lateral cheek plates, 3 overlapping riveted rear tergite bands) separated by deep dark panel seams and tiny recessed hex rivets. NEVER one uninterrupted smooth white shell.
6. **Exposed Dark Flank Mechanism:** Deep matte-black and graphite mechanical chassis clearly visible beneath the white carapace skirts along both flanks, packed with horizontal hydraulic pistons, braided black hoses, rotary servo hubs, spur gears, PCBs, and micro-fasteners (260+ merged small parts).
7. **Camera Lens Optics:** Twin large glossy deep-black forward camera lenses side-by-side in machined dark barrels with razor-thin glowing emerald bezels and 10-blade irises, flanked by 2 smaller angled lateral sensor lenses with emerald bezels, over a dark central chelicerae/hose manifold.
8. **5-Segment Arched Tail (Metasoma):** Five tapered glossy-white curved shell segments separated by prominent dark cylindrical servo joints, each segment carrying a crisp razor-thin emerald accent line along its outer dorsal spine and recessed rivets near its collar seams.
9. **8 Articulated Mechanical Legs:** Four pairs of splayed armored legs with 2-bone IK, dark rotary servo drums with thin emerald joint rings at coxa, knee, and ankle, curved glossy-white armor sleeves with dark seam cutouts, and tapered brushed-steel mechanical claw feet planted cleanly on `FLOOR_Y`. NO furry bristles.
10. **Strict Green Discipline:** Emerald `#16b364` appears ONLY as thin lines, eye bezels, rotary joint rings, inner pincer rim edges, tail dorsal trim lines, and internal glowing coils behind glass. ZERO isolated green dots sprinkled over white armor plates. ZERO leftover warm/orange pixels (`probe_warm` = 0).
11. **900 px Thumbnail Density:** Downscaled to 900 px wide next to the reference and the approved tarantula still, the build reads equally dense, sculpted, crisp, and mechanically credible — never like a sparse white plastic toy.
12. **Measured Dark Share & Proportions:** Dark-pixel share (`luma < 80`) in the scorpion's bounding box reaches at least `0.8 × 0.0893 = 0.0715` (target `0.09–0.14`), and trunk/pincer/tail/height proportions match the reference within a few hundredths.
