"""Run with Blender: blender -b -P scripts/prepare-car.py -- INPUT.glb OUTPUT.glb"""
import bpy,sys,math
from mathutils import Vector
from pathlib import Path
args=sys.argv[sys.argv.index('--')+1:]
if len(args)!=2:raise SystemExit('Expected INPUT.glb OUTPUT.glb after --')
source,target=map(Path,args)
if source.resolve()==target.resolve():raise SystemExit('Use a separate output path to preserve your original model.')
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(source.resolve()))
objects=list(bpy.context.scene.objects)
corners=[o.matrix_world@Vector(c) for o in objects if o.type=='MESH' for c in o.bound_box]
if not corners:raise SystemExit('The asset contains no mesh geometry.')
low=Vector(tuple(min(c[i] for c in corners) for i in range(3)))
high=Vector(tuple(max(c[i] for c in corners) for i in range(3)))
size=high-low;center=(high+low)/2;ratio=6/max(size.x,size.y)
group=bpy.data.objects.new('classic-car-root',None);bpy.context.collection.objects.link(group)
for obj in objects:
    if obj.parent is None:obj.parent=group
group.location=Vector((-center.x,-center.y,-low.z))*ratio
group.scale=(ratio,ratio,ratio)
if size.x>size.y:
    group.rotation_euler.z=math.pi/2
    group.location=Vector((-group.location.y,group.location.x,group.location.z))
target.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(target.resolve()),export_format='GLB',export_apply=True,export_animations=False,export_cameras=False,export_lights=False)
print('Prepared production GLB:',target)
