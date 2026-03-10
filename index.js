'use strict';

var VS_MAIN = [
    'attribute vec3 aPos;',
    'attribute vec3 aNorm;',
    'attribute vec2 aUV;',
    'uniform mat4 uM, uV, uP;',
    'uniform mat3 uNM;',
    'varying vec3 vNorm, vFrag;',
    'varying vec2 vUV;',
    'void main(){',
    '  vec4 wp = uM * vec4(aPos,1.0);',
    '  vFrag = wp.xyz;',
    '  vNorm = normalize(uNM * aNorm);',
    '  vUV = aUV;',
    '  gl_Position = uP * uV * wp;',
    '}'
].join('\n');

var FS_MAIN = [
    'precision mediump float;',
    'varying vec3 vNorm, vFrag;',
    'varying vec2 vUV;',
    'uniform sampler2D uTex;',
    // P3: Controlul camerei, lumina si umbre (S9) - Adaugarea unei surse de lumina si umbre (Variabilele de lumina).
    'uniform vec3 uSunDir, uSunCol, uAmb, uFogCol;',
    'uniform float uFogD;',
    'uniform vec3 uLP[8];',
    'uniform vec3 uLC[8];',
    'uniform float uLR[8];',
    'uniform int uLCnt;',
    'vec3 ptLight(vec3 lp, vec3 lc, float lr, vec3 n, vec3 fp, vec3 tc){',
    '  vec3 d=lp-fp; float dist=length(d);',
    '  if(dist>=lr) return vec3(0.0);',
    '  float a=1.0-dist/lr; a*=a;',
    '  return tc*lc*max(dot(n,normalize(d)),0.0)*a*2.5;',
    '}',
    'void main(){',
    '  vec4 tc=texture2D(uTex,vUV);',
    '  vec3 n=normalize(vNorm);',
    '  vec3 col=tc.rgb*(uAmb+max(dot(n,normalize(uSunDir)),0.0)*uSunCol);',
    '  for(int i=0; i<8; i++){',
    '    if(i>=uLCnt) break;',
    '    col+=ptLight(uLP[i],uLC[i],uLR[i],n,vFrag,tc.rgb);',
    '  }',
    '  float fog=clamp(1.0-exp(-uFogD*length(vFrag)*0.01),0.0,0.82);',
    '  col=mix(col,uFogCol,fog);',
    '  gl_FragColor=vec4(col,tc.a);',
    '}'
].join('\n');

var VS_SKY = [
    'attribute vec3 aPos;',
    'uniform mat4 uV, uP;',
    'varying vec3 vDir;',
    'void main(){',
    '  vDir=aPos;',
    '  mat4 rv = mat4(uV[0], uV[1], uV[2], vec4(0.0, 0.0, 0.0, 1.0));',
    '  vec4 p=uP*rv*vec4(aPos*500.0,1.0);',
    '  gl_Position=p.xyww;',
    '}'
].join('\n');

var FS_SKY = [
    'precision mediump float;',
    'varying vec3 vDir;',
    'uniform float uTOD;',
    'void main(){',
    '  vec3 d=normalize(vDir);',
    '  float t=clamp(d.y*0.5+0.5,0.0,1.0);',
    '  vec3 top=mix(vec3(0.02,0.04,0.14),vec3(0.05,0.15,0.5),uTOD);',
    '  vec3 hor=mix(vec3(0.07,0.05,0.12),vec3(0.7,0.5,0.3),uTOD);',
    '  vec3 sky=mix(hor,top,pow(t,0.6));',
    '  vec3 sd=normalize(vec3(0.4,0.6,-0.5));',
    '  float sun=max(dot(d,sd),0.0);',
    '  sky+=vec3(1.0,0.9,0.7)*pow(max(sun,0.0),64.0)*0.4*uTOD;',
    '  sky+=vec3(1.0,1.0,0.9)*pow(max(sun,0.0),512.0)*3.0;',
    '  if(d.y<0.12&&d.y>-0.05){',
    '    float hh=(sin(d.x*3.9+d.z*2.1)*0.5+0.5)*0.6*0.09;',
    '    float bl=smoothstep(hh,hh+0.02,d.y+0.05);',
    '    sky=mix(mix(vec3(0.05,0.12,0.05),vec3(0.1,0.25,0.08),uTOD),sky,bl);',
    '  }',
    '  gl_FragColor=vec4(sky,1.0);',
    '}'
].join('\n');

function m4id() { return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]); }
function m4mul(a,b) {
    var r=new Float32Array(16);
    for(var c=0;c<4;c++) {
        for(var ro=0;ro<4;ro++) {
            r[c*4+ro] = a[0*4+ro]*b[c*4+0] + a[1*4+ro]*b[c*4+1] + a[2*4+ro]*b[c*4+2] + a[3*4+ro]*b[c*4+3];
        }
    }
    return r;
}

function m4persp(fov,asp,n,f) {
    var r=new Float32Array(16), ff=1.0/Math.tan(fov/2);
    r[0]=ff/asp; r[5]=ff; r[10]=-(f+n)/(f-n); r[11]=-1; r[14]=-(2*f*n)/(f-n);
    return r;
}

function m4look(ex,ey,ez,cx,cy,cz) {
    var zx=ex-cx, zy=ey-cy, zz=ez-cz;
    var zl=Math.sqrt(zx*zx+zy*zy+zz*zz)||1; zx/=zl; zy/=zl; zz/=zl;
    var xx=1.0*zz-0.0*zy, xy=0.0*zx-0.0*zz, xz=0.0*zy-1.0*zx;
    var xl=Math.sqrt(xx*xx+xy*xy+xz*xz)||1; xx/=xl; xy/=xl; xz/=xl;
    var yx=zy*xz-zz*xy, yy=zz*xx-zx*xz, yz=zx*xy-zy*xx;
    var r=new Float32Array(16);
    r[0]=xx; r[4]=xy; r[8]=xz;  r[12]=-(xx*ex+xy*ey+xz*ez);
    r[1]=yx; r[5]=yy; r[9]=yz;  r[13]=-(yx*ex+yy*ey+yz*ez);
    r[2]=zx; r[6]=zy; r[10]=zz; r[14]=-(zx*ex+zy*ey+zz*ez);
    r[15]=1;
    return r;
}

function m4tr(x,y,z) { var r=m4id(); r[12]=x; r[13]=y; r[14]=z; return r; }
function m4sc(x,y,z) { var r=m4id(); r[0]=x; r[5]=y; r[10]=z; return r; }
function m4rx(a) { var r=m4id(), c=Math.cos(a), s=Math.sin(a); r[5]=c; r[6]=s; r[9]=-s; r[10]=c; return r; }
function m4ry(a) { var r=m4id(), c=Math.cos(a), s=Math.sin(a); r[0]=c; r[2]=-s; r[8]=s; r[10]=c; return r; }
function m4rz(a) { var r=m4id(), c=Math.cos(a), s=Math.sin(a); r[0]=c; r[1]=s; r[4]=-s; r[5]=c; return r; }

function m4nm(m) {
    var a=m[0],b=m[1],c=m[2], d=m[4],e=m[5],f=m[6], g=m[8],h=m[9],k=m[10];
    var b01=k*e-f*h, b11=-k*d+f*g, b21=h*d-e*g;
    var det=a*b01+b*b11+c*b21;
    if(!det) return new Float32Array([1,0,0, 0,1,0, 0,0,1]);
    det=1/det;
    return new Float32Array([
        b01*det, (-k*b+c*h)*det, (f*b-c*e)*det,
        b11*det, (k*a-c*g)*det, (-f*a+c*d)*det,
        b21*det, (-h*a+b*g)*det, (e*a-b*d)*det
    ]);
}

function mkShader(gl,type,src) {
    var s=gl.createShader(type);
    gl.shaderSource(s,src); gl.compileShader(s);
    return s;
}

function mkProg(gl,vs,fs) {
    var p=gl.createProgram();
    gl.attachShader(p,mkShader(gl,gl.VERTEX_SHADER,vs));
    gl.attachShader(p,mkShader(gl,gl.FRAGMENT_SHADER,fs));
    gl.linkProgram(p);
    return p;
}

function mkLocs(gl,p) {
    var L={};
    var na=gl.getProgramParameter(p,gl.ACTIVE_ATTRIBUTES);
    for(var i=0;i<na;i++){var inf=gl.getActiveAttrib(p,i); L[inf.name]=gl.getAttribLocation(p,inf.name);}
    var nu=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);
    for(var j=0;j<nu;j++){
        var infU=gl.getActiveUniform(p,j);
        var name=infU.name;
        if(name.indexOf('[') !== -1) name = name.substring(0, name.indexOf('['));
        L[name] = gl.getUniformLocation(p, name);
    }
    return L;
}

function buildMesh(gl,pos,nor,uv,idx) {
    var data=[], n=pos.length/3;
    for(var i=0;i<n;i++){
        data.push(pos[i*3],pos[i*3+1],pos[i*3+2]);
        data.push(nor[i*3],nor[i*3+1],nor[i*3+2]);
        data.push(uv[i*2],uv[i*2+1]);
    }
    var vbo=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,vbo);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);
    var ibo=gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(idx),gl.STATIC_DRAW);
    return {vbo:vbo,ibo:ibo,cnt:idx.length,str:32};
}

function mkBox(gl,w,h,d,tw,th) {
    tw=tw||1; th=th||1;
    var hw=w/2,hh=h/2,hd=d/2;
    var pos=[],nor=[],uv=[],idx=[];
    function face(v0,v1,v2,v3,nx,ny,nz) {
        var b=pos.length/3;
        pos.push(v0[0],v0[1],v0[2], v1[0],v1[1],v1[2], v2[0],v2[1],v2[2], v3[0],v3[1],v3[2]);
        nor.push(nx,ny,nz, nx,ny,nz, nx,ny,nz, nx,ny,nz);
        uv.push(0,0, tw,0, tw,th, 0,th);
        idx.push(b,b+1,b+2, b,b+2,b+3);
    }
    face([-hw,-hh,-hd],[hw,-hh,-hd],[hw,hh,-hd],[-hw,hh,-hd], 0,0,-1);
    face([-hw,-hh,hd],[hw,-hh,hd],[hw,hh,hd],[-hw,hh,hd], 0,0,1);
    face([-hw,-hh,-hd],[-hw,-hh,hd],[-hw,hh,hd],[-hw,hh,-hd], -1,0,0);
    face([hw,-hh,-hd],[hw,-hh,hd],[hw,hh,hd],[hw,hh,-hd], 1,0,0);
    face([-hw,-hh,-hd],[hw,-hh,-hd],[hw,-hh,hd],[-hw,-hh,hd], 0,-1,0);
    face([-hw,hh,-hd],[hw,hh,-hd],[hw,hh,hd],[-hw,hh,hd], 0,1,0);
    return buildMesh(gl,pos,nor,uv,idx);
}

function mkPlane(gl,w,d,tw,th) {
    tw=tw||1; th=th||1;
    var pos=[-w/2,0,-d/2, w/2,0,-d/2, w/2,0,d/2, -w/2,0,d/2];
    var nor=[0,1,0, 0,1,0, 0,1,0, 0,1,0];
    var uv=[0,0, tw,0, tw,th, 0,th];
    var idx=[0,1,2, 0,2,3];
    return buildMesh(gl,pos,nor,uv,idx);
}

function mkCyl(gl,r,h,segs) {
    segs=segs||12;
    var pos=[],nor=[],uv=[],idx=[];
    for(var i=0;i<=segs;i++){
        var a=i/segs*Math.PI*2, x=Math.cos(a)*r, z=Math.sin(a)*r;
        pos.push(x,0,z, x,h,z);
        nor.push(x/r,0,z/r, x/r,0,z/r);
        uv.push(i/segs,0, i/segs,1);
    }
    for(var j=0;j<segs;j++){
        var b=j*2; idx.push(b,b+1,b+2, b+2,b+1,b+3);
    }
    var capCenter=(segs+1)*2;
    pos.push(0,0,0, 0,h,0);
    nor.push(0,-1,0, 0,1,0);
    uv.push(0.5,0.5, 0.5,0.5);
    for(var k=0;k<segs;k++){
        var a1=k/segs*Math.PI*2, a2=(k+1)/segs*Math.PI*2;
        var x1=Math.cos(a1)*r, z1=Math.sin(a1)*r;
        var x2=Math.cos(a2)*r, z2=Math.sin(a2)*r;
        var bi=pos.length/3;
        pos.push(x1,0,z1, x2,0,z2, x1,h,z1, x2,h,z2);
        nor.push(0,-1,0, 0,-1,0, 0,1,0, 0,1,0);
        uv.push(0.5+x1/r*0.5,0.5+z1/r*0.5, 0.5+x2/r*0.5,0.5+z2/r*0.5,
            0.5+x1/r*0.5,0.5+z1/r*0.5, 0.5+x2/r*0.5,0.5+z2/r*0.5);
        idx.push(capCenter,bi,bi+1);
        idx.push(capCenter+1,bi+3,bi+2);
    }
    return buildMesh(gl,pos,nor,uv,idx);
}

function mkRoadSeg(gl,x0,z0,x1,z1,x2,z2,x3,z3) {
    var pos=[x0,0.02,z0, x1,0.02,z1, x2,0.02,z2, x3,0.02,z3];
    var nor=[0,1,0, 0,1,0, 0,1,0, 0,1,0];
    var uv=[0,0, 1,0, 1,1, 0,1];
    return buildMesh(gl,pos,nor,uv,[0,1,2,0,2,3]);
}

function mkCvs(w,h,fn) {
    var c=document.createElement('canvas'); c.width=w; c.height=h;
    fn(c.getContext('2d'),w,h); return c;
}

function mkTex(gl,c) {
    var t=gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D,t);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,c);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    return t;
}

function buildAllTextures(gl) {
    var T={};

    // P1: Definirea scenei intr-un cub (S4) - Adaugarea de texturi pentru baza (teren/iarba).
    T.grass = mkTex(gl,mkCvs(512,512,function(ctx,w,h){
        ctx.fillStyle='#030712'; ctx.fillRect(0,0,w,h);
        ctx.strokeStyle='#00d4ff'; ctx.lineWidth=1;
        ctx.globalAlpha=0.15;
        for(var i=0;i<=w;i+=32){
            ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,h); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(w,i); ctx.stroke();
        }
        ctx.globalAlpha=1.0;
    }));

    // P2: Definire circuit stradal si obiecte statice (S6) - Texturarea corespunzatoare a circuitului.
    T.road = mkTex(gl,mkCvs(512,512,function(ctx,w,h){
        ctx.fillStyle='#0a0a0f'; ctx.fillRect(0,0,w,h);
        ctx.fillStyle='#111822';
        for(var i=0;i<3000;i++){
            ctx.fillRect(Math.random()*w,Math.random()*h,2,2);
        }
        ctx.shadowColor='#ff6b00';
        ctx.shadowBlur=10;
        ctx.fillStyle = '#ff6b00';
        for(var j=0; j<h; j+=64) {
            ctx.fillRect(w/2 - 4, j + 16, 8, 32);
        }
        ctx.shadowBlur=0;
    }));

    T.bld1 = mkTex(gl,mkCvs(512,512,function(ctx,w,h){
        ctx.fillStyle='#050811'; ctx.fillRect(0,0,w,h);
        var pw=w/16,ph=h/32;
        for(var r=0;r<32;r++) for(var c=0;c<16;c++){
            if(Math.random()>0.6){
                ctx.fillStyle=Math.random()>0.5?'#00d4ff':'#0088ff';
                ctx.shadowColor='#00d4ff'; ctx.shadowBlur=8;
                ctx.fillRect(c*pw+pw*0.2,r*ph+ph*0.2,pw*0.6,ph*0.6);
            }
        }
        ctx.shadowBlur=0;
    }));

    T.bld2 = mkTex(gl,mkCvs(512,512,function(ctx,w,h){
        ctx.fillStyle='#0a0500'; ctx.fillRect(0,0,w,h);
        var pw=w/12,ph=h/24;
        for(var r=0;r<24;r++) for(var c=0;c<12;c++){
            if(Math.random()>0.5){
                ctx.fillStyle=Math.random()>0.5?'#ff6b00':'#ff2200';
                ctx.shadowColor='#ff6b00'; ctx.shadowBlur=10;
                ctx.fillRect(c*pw+pw*0.1,r*ph+ph*0.15,pw*0.8,ph*0.7);
            }
        }
        ctx.shadowBlur=0;
    }));

    T.bld3 = mkTex(gl,mkCvs(512,512,function(ctx,w,h){
        ctx.fillStyle='#0a0011'; ctx.fillRect(0,0,w,h);
        ctx.strokeStyle='#7b00ff'; ctx.lineWidth=2;
        for(var x=0;x<=w;x+=w/8){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
        for(var y=0;y<=h;y+=h/16){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }
        var pw=w/8,ph=h/16;
        for(var r=0;r<16;r++) for(var c=0;c<8;c++){
            if(Math.random()>0.7){
                ctx.fillStyle='#ff0080';
                ctx.shadowColor='#ff0080'; ctx.shadowBlur=15;
                ctx.fillRect(c*pw+pw*0.25,r*ph+ph*0.25,pw*0.5,ph*0.5);
            }
        }
        ctx.shadowBlur=0;
    }));

    T.bark = mkTex(gl,mkCvs(64,256,function(ctx,w,h){
        ctx.fillStyle='#111'; ctx.fillRect(0,0,w,h);
        ctx.fillStyle='#00d4ff';
        for(var i=0;i<20;i++){
            ctx.fillRect(Math.random()*w,Math.random()*h,2,10+Math.random()*20);
        }
    }));

    T.leaves = mkTex(gl,mkCvs(256,256,function(ctx,w,h){
        ctx.clearRect(0,0,w,h);
        for(var i=0;i<120;i++){
            ctx.fillStyle=Math.random()>0.5?'#7b00ff':'#ff0080';
            ctx.globalAlpha=0.6+Math.random()*0.4;
            ctx.beginPath(); ctx.arc(Math.random()*w,Math.random()*h,6+Math.random()*12,0,Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha=1;
    }));

    T.metal = mkTex(gl,mkCvs(32,32,function(ctx,w,h){
        var g=ctx.createLinearGradient(0,0,w,0);
        g.addColorStop(0,'#111'); g.addColorStop(0.5,'#444'); g.addColorStop(1,'#111');
        ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
    }));

    function solid(col){ return mkTex(gl,mkCvs(4,4,function(ctx,w,h){ctx.fillStyle=col;ctx.fillRect(0,0,w,h);})); }
    T.white=solid('#ffffff'); T.black=solid('#111111'); T.yellow=solid('#00d4ff'); T.red=solid('#ff0080');
    T.glass=mkTex(gl,mkCvs(4,4,function(ctx,w,h){ctx.fillStyle='rgba(0,212,255,0.8)';ctx.fillRect(0,0,w,h);}));

    T.carRed=mkTex(gl,mkCvs(64,64,function(ctx,w,h){
        var g=ctx.createLinearGradient(0,0,w,h);
        g.addColorStop(0,'#ff6b00'); g.addColorStop(1,'#ff0080');
        ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
    }));

    var npcCols=[['#00d4ff','#0055ff'],['#7b00ff','#ff0080'],['#ff6b00','#ffaa00'],['#ffffff','#aaaaaa'],['#00ffaa','#008855']];
    T.npcCar=[];
    for(var i=0;i<npcCols.length;i++){
        var c1=npcCols[i][0], c2=npcCols[i][1];
        T.npcCar.push(mkTex(gl,mkCvs(64,64,(function(a,b){return function(ctx,w,h){
            var g=ctx.createLinearGradient(0,0,w,h);
            g.addColorStop(0,a); g.addColorStop(1,b);
            ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
        };})(c1,c2))));
    }

    // P1: Definirea scenei intr-un cub (S4) - Adaugarea de texturi care sa ofere senzatia de orizont (cer, dealuri, munti).
    T.horizon = mkTex(gl,mkCvs(1024,512,function(ctx,w,h){
        var g=ctx.createLinearGradient(0,0,0,h);
        g.addColorStop(0,'#050211'); g.addColorStop(0.5,'#120422'); g.addColorStop(1,'#2a0845');
        ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
        for(var i=0;i<300;i++){
            ctx.fillStyle=Math.random()>0.5?'#00d4ff':'#ff0080';
            ctx.globalAlpha=Math.random()*0.8;
            ctx.fillRect(Math.random()*w, Math.random()*h*0.7, 2, 2);
        }
        ctx.globalAlpha=1;
        function cityLine(yBase, color){
            ctx.fillStyle=color;
            var x=0;
            while(x<w){
                var bw=10+Math.random()*40;
                var bh=h*(yBase-Math.random()*0.3);
                ctx.fillRect(x,bh,bw,h-bh);
                x+=bw+Math.random()*10;
            }
        }
        cityLine(0.8, '#0a0a1a');
        cityLine(0.9, '#05050a');
    }));

    // P3: Controlul camerei, lumina si umbre (S9) - Adaugarea unei surse de lumina si umbre (Umbra generata procedural).
    T.shadow = mkTex(gl,mkCvs(256,256,function(ctx,w,h){
        var grd=ctx.createRadialGradient(w/2,h/2,2,w/2,h/2,w/2);
        grd.addColorStop(0,'rgba(0,212,255,0.4)');
        grd.addColorStop(0.5,'rgba(0,212,255,0.1)');
        grd.addColorStop(1,'rgba(0,0,0,0.0)');
        ctx.fillStyle=grd; ctx.fillRect(0,0,w,h);
    }));

    return T;
}

function bindM(gl,mesh,L) {
    gl.bindBuffer(gl.ARRAY_BUFFER,mesh.vbo);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,mesh.ibo);
    var s=mesh.str;
    if(L.aPos!==undefined){gl.enableVertexAttribArray(L.aPos);gl.vertexAttribPointer(L.aPos,3,gl.FLOAT,false,s,0);}
    if(L.aNorm!==undefined){gl.enableVertexAttribArray(L.aNorm);gl.vertexAttribPointer(L.aNorm,3,gl.FLOAT,false,s,12);}
    if(L.aUV!==undefined){gl.enableVertexAttribArray(L.aUV);gl.vertexAttribPointer(L.aUV,2,gl.FLOAT,false,s,24);}
}

function drwM(gl,mesh,L,mat,tex) {
    if(L.uM!==undefined) gl.uniformMatrix4fv(L.uM,false,mat);
    if(L.uNM!==undefined) gl.uniformMatrix3fv(L.uNM,false,m4nm(mat));
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D,tex);
    if(L.uTex!==undefined) gl.uniform1i(L.uTex,0);
    gl.drawElements(gl.TRIANGLES,mesh.cnt,gl.UNSIGNED_SHORT,0);
}

function Game() {
    var self=this;
    self.canvas=document.getElementById('glCanvas');
    self.gl=self.canvas.getContext('webgl',{antialias:true,depth:true});
    if(!self.gl) return;
    self.resize();
    window.addEventListener('resize',function(){self.resize();});
    self.keys={};
    var GKEYS={KeyW:1,KeyA:1,KeyS:1,KeyD:1,ArrowUp:1,ArrowDown:1,ArrowLeft:1,ArrowRight:1,KeyZ:1,KeyX:1};
    window.addEventListener('keydown',function(e){
        self.keys[e.code]=true; if(GKEYS[e.code]) e.preventDefault();
    });
    window.addEventListener('keyup',function(e){ self.keys[e.code]=false; });

    // P3: Controlul camerei, lumina si umbre (S9) - Adaugarea controlului camerei pe toate cele trei axe si rotatii (Zoom cu scroll).
    self.canvas.addEventListener('wheel',function(e){
        self.cam.dist = Math.min(120, Math.max(2, self.cam.dist + e.deltaY*0.01));
        e.preventDefault();
    },{passive:false});
    self.canvas.addEventListener('contextmenu', function(e){ e.preventDefault(); });

    self.init();
}

Game.prototype.resize=function(){
    this.canvas.width=window.innerWidth; this.canvas.height=window.innerHeight;
    if(this.gl)this.gl.viewport(0,0,this.canvas.width,this.canvas.height);
};

Game.prototype.init=function(){
    var self=this, gl=self.gl;
    gl.enable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);

    self.prog=mkProg(gl,VS_MAIN,FS_MAIN); self.L=mkLocs(gl,self.prog);
    self.skyP=mkProg(gl,VS_SKY,FS_SKY);   self.SL=mkLocs(gl,self.skyP);

    self.T=buildAllTextures(gl);

    self.mBox=mkBox(gl,1,1,1);
    self.mGnd=mkPlane(gl,400,400,40,40);
    self.mCyl=mkCyl(gl,0.5,1,16);
    self.mThin=mkCyl(gl,0.08,1,8);
    self.mWheel=mkCyl(gl,0.3,0.2,12);

    self.cam={ang:0,tilt:0.4,dist:14, panX:0, panZ:0, mode:'follow'};

    // C1: Obiect controlabil și coliziuni (S10) - Adaugarea unui obiect controlabil (mașina).
    self.P={x:0,y:0.4,z:-30,rot:0,spd:0,
        maxSpd:0.12,
        acc:0.006,
        brk:0.025,
        fri:0.94,
        str:0.03,
        wasCol:false};

    self.track={rx:38,rz:28,w:8,segs:120};
    self.tod=0.75; self.lapCount=1; self.colCnt=0; self.started=false; self.startTime=0; self.gameTime=0; this._lk=false;

    self.buildScene();
    self.buildNPCs();
    self.mmCtx=document.getElementById('minimapCanvas').getContext('2d');

    var btn=document.getElementById('startBtn');
    btn.addEventListener('click',function(){self.startGame();});

    this.updateInfoPanel();
};

Game.prototype.updateInfoPanel=function(){
    var el=document.getElementById('info-panel');
    el.innerHTML = 'TURBO CITY v1.0<br>WebGL Racing Simulator<br><br>Camera: FOLLOW<br>Controls:<br>WASD — Drive | Z/X or Mouse Wheel — Zoom';
};

Game.prototype.trkPt=function(t){
    var a=t*Math.PI*2;
    return {x:Math.cos(a)*this.track.rx, z:Math.sin(a)*this.track.rz};
};

Game.prototype.trkTan=function(t){
    var a=t*Math.PI*2;
    var x=-Math.sin(a)*this.track.rx, z=Math.cos(a)*this.track.rz;
    var l=Math.sqrt(x*x+z*z)||1;
    return {x:x/l, z:z/l};
};

Game.prototype.buildScene=function(){
    var gl=this.gl,self=this;
    self.statics=[];

    // P2: Definire circuit stradal si obiecte statice (S6) - Adaugarea a minim 10 obiecte statice (cladiri, pomi, etc.).
    var bDefs=[
        [0,0,12,30,12,'bld1',0],
        [15,10,10,40,10,'bld2',0.2],
        [-15,10,10,25,10,'bld3',-0.1],
        [10,-15,14,35,14,'bld1',0.5],
        [-12,-12,12,20,12,'bld2',0],
        [55,40,16,45,16,'bld3',0],
        [-55,40,14,38,14,'bld1',0.2],
        [55,-40,15,30,15,'bld2',-0.2],
        [-55,-40,16,42,16,'bld3',0.1],
        [65,0,14,50,14,'bld1',0],
        [-65,0,14,35,14,'bld2',0],
        [0,55,16,40,16,'bld3',0.5],
        [0,-55,15,45,15,'bld1',-0.3],
        [35,50,12,28,12,'bld2',0],
        [-35,50,12,30,12,'bld3',0],
        [35,-50,12,32,12,'bld1',0.1],
        [-35,-50,12,26,12,'bld2',0]
    ];

    for(var i=0;i<bDefs.length;i++){
        var b=bDefs[i];
        self.statics.push({mesh:self.mBox,tex:self.T[b[5]],
            px:b[0],py:b[3]/2,pz:b[1],sx:b[2],sy:b[3],sz:b[4],ry:b[6],
            aabb:{x0:b[0]-b[2]/2,x1:b[0]+b[2]/2,z0:b[1]-b[4]/2,z1:b[1]+b[4]/2}});

        if(Math.random()>0.5){
            self.statics.push({mesh:self.mBox,tex:self.T[b[5]],
                px:b[0],py:b[3]+2,pz:b[1],sx:b[2]*0.6,sy:4,sz:b[4]*0.6,ry:b[6],
                aabb:null});
        }
    }

    var tDefs=[[48,0],[48,8],[48,-8],[-48,0],[-48,8],[-48,-8],[-10,48],[5,-45],[5,0],[-5,0]];
    for(var j=0;j<tDefs.length;j++){
        var tx=tDefs[j][0],tz=tDefs[j][1],th=4+Math.random()*3;
        self.statics.push({mesh:self.mCyl,tex:self.T.bark,px:tx,py:0,pz:tz,sx:0.4,sy:th,sz:0.4,ry:0,aabb:{x0:tx-0.3,x1:tx+0.3,z0:tz-0.3,z1:tz+0.3}});
        self.statics.push({mesh:self.mBox,tex:self.T.leaves,px:tx,py:th,pz:tz,sx:3,sy:4,sz:3,ry:0,aabb:null});
    }

    // P1: Definirea scenei intr-un cub (S4) - Adaugarea unei zone de relief in interiorul scenei.
    for(var r=0; r<5; r++) {
        self.statics.push({mesh:self.mBox, tex:self.T.grass, px:80+r*5, py:r*2, pz:80, sx:10, sy:r*4, sz:10, ry:0, aabb:null});
    }

    self.lights=[];
    // P3: Controlul camerei, lumina si umbre (S9) - Adaugarea unor stalpi de iluminat care produc umbre multiple.
    for(var k=0;k<20;k++){
        var t=k/20,pt=self.trkPt(t),tn=self.trkTan(t);
        var nx=-tn.z,nz=tn.x;
        var lx=pt.x+nx*7.5,lz=pt.z+nz*7.5,ph=8.5;
        var rotY=Math.atan2(nx,nz);

        self.statics.push({mesh:self.mBox,tex:self.T.metal,px:lx,py:0.5,pz:lz,sx:1.0,sy:1.0,sz:1.0,ry:0,aabb:{x0:lx-0.8,x1:lx+0.8,z0:lz-0.8,z1:lz+0.8}});
        self.statics.push({mesh:self.mBox,tex:self.T.metal,px:lx,py:ph/2,pz:lz,sx:0.4,sy:ph,sz:0.4,ry:0,aabb:null});
        self.statics.push({mesh:self.mBox,tex:self.T.metal,px:lx-nx*2.0,py:ph,pz:lz-nz*2.0,sx:0.5,sy:0.5,sz:4.0,ry:rotY,aabb:null});
        self.statics.push({mesh:self.mBox,tex:self.T.yellow,px:lx-nx*3.0,py:ph-0.2,pz:lz-nz*3.0,sx:1.0,sy:0.2,sz:1.5,ry:rotY,aabb:null});

        if(self.lights.length<8)self.lights.push({x:lx-nx*3.0,y:ph-0.5,z:lz-nz*3.0,r:0.0,g:0.8,b:1.0,rad:45});
    }

    self.roads=[];
    var w=self.track.w;

    // P2: Definire circuit stradal si obiecte statice (S6) - Definirea geometrica a unui circuit stradal inchis (cerc, oval, dreptunghiular).
    for(var m=0;m<self.track.segs;m++){
        var t0=m/self.track.segs,t1=(m+1)/self.track.segs;
        var p0=self.trkPt(t0),p1=self.trkPt(t1),n0=self.trkTan(t0),n1=this.trkTan(t1);
        var r0x=-n0.z,r0z=n0.x,r1x=-n1.z,r1z=n1.x;
        self.roads.push(mkRoadSeg(gl,p0.x+r0x*w/2,p0.z+r0z*w/2,p0.x-r0x*w/2,p0.z-r0z*w/2,p1.x-r1x*w/2,p1.z-r1z*w/2,p1.x+r1x*w/2,p1.z+r1z*w/2));
    }
};

Game.prototype.buildNPCs=function(){
    var self=this; self.npcs=[];

    // C2: Obiecte in miscare si iluminat (Ex) - Adaugarea unor obiecte care se mișca aleator (Pietoni).
    for(var i=0;i<8;i++){
        var a=Math.random()*Math.PI*2,r=14+Math.random()*18;
        self.npcs.push({type:'ped',x:Math.cos(a)*r,y:0.4,z:Math.sin(a)*r*0.7,rot:Math.random()*Math.PI*2,spd:0.004+Math.random()*0.006,timer:60+Math.random()*100,target:Math.random()*Math.PI*2,tex:self.T.npcCar[i%5]});
    }

    // C2: Obiecte in miscare si iluminat (Ex) - Adaugarea unor obiecte care se mișca dupa o regula prestabilita (Masini trafic).
    for(var j=0;j<6;j++){
        var pt=this.trkPt(j/6);
        self.npcs.push({type:'car',trackT:j/6,x:pt.x,y:0.4,z:pt.z,rot:0,spd:0.0002+Math.random()*0.0003,tex:self.T.npcCar[j%5]});
    }
};

Game.prototype.playCrashSound=function(){
    if(!this.audioCtx){
        this.audioCtx=new(window.AudioContext||window.webkitAudioContext)();
    }
    if(this.audioCtx.state==='suspended')this.audioCtx.resume();
    var osc=this.audioCtx.createOscillator();
    var gain=this.audioCtx.createGain();
    osc.type='sawtooth';
    osc.frequency.setValueAtTime(150,this.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40,this.audioCtx.currentTime+0.3);
    gain.gain.setValueAtTime(0.3,this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01,this.audioCtx.currentTime+0.3);
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start();
    osc.stop(this.audioCtx.currentTime+0.3);
};

Game.prototype.update=function(){
    var k=this.keys,P=this.P;
    var ac=0,st=0;

    // C1: Obiect controlabil și coliziuni (S10) - Adaugarea unui obiect controlabil (mașina).
    if(k.KeyW||k.ArrowUp)ac=1;
    if(k.KeyS||k.ArrowDown)ac=-1;
    if(k.KeyA||k.ArrowLeft)st=1;
    if(k.KeyD||k.ArrowRight)st=-1;
    if(ac>0)P.spd=Math.min(P.spd+P.acc,P.maxSpd);
    else if(ac<0)P.spd=Math.max(P.spd-P.brk,-P.maxSpd*0.4);
    else P.spd*=P.fri;
    if(Math.abs(P.spd)>0.001)P.rot+=st*P.str*(P.spd/(P.maxSpd||0.001));

    var nx=P.x+Math.sin(P.rot)*P.spd,nz=P.z+Math.cos(P.rot)*P.spd;
    var hit=false,pad=0.8;

    // C1: Obiect controlabil și coliziuni (S10) - Detectarea coliziunilor dintre cladiri si obiect.
    for(var i=0;i<this.statics.length;i++){
        var ab=this.statics[i].aabb;
        if(!ab)continue;
        if(nx>ab.x0-pad&&nx<ab.x1+pad&&nz>ab.z0-pad&&nz<ab.z1+pad){
            hit=true;
            break;
        }
    }

    if(!hit){
        for(var m=0;m<this.npcs.length;m++){
            var npc=this.npcs[m];
            var dx=nx-npc.x,dz=nz-npc.z;
            var dist=Math.sqrt(dx*dx+dz*dz);
            var colRad=(npc.type==='ped')?1.0:2.5;
            if(dist<colRad){
                hit=true;
                break;
            }
        }
    }

    if(!hit){
        P.x=nx;
        P.z=nz;
        P.wasCol=false;
    }else{
        P.spd=-0.06;
        P.x-=Math.sin(P.rot)*0.5;
        P.z-=Math.cos(P.rot)*0.5;
        if(!P.wasCol){
            P.wasCol=true;
            this.colCnt++;
            this.flashCol();
            this.playCrashSound();
        }
    }
    P.x=Math.max(-190,Math.min(190,P.x));
    P.z=Math.max(-190,Math.min(190,P.z));

    // P3: Controlul camerei, lumina si umbre (S9) - Adaugarea controlului camerei pe toate cele trei axe si rotatii (Control zoom pentru axa Z).
    if(k.KeyZ)this.cam.dist=Math.max(2,this.cam.dist-0.2);
    if(k.KeyX)this.cam.dist=Math.min(120,this.cam.dist+0.2);

    for(var j=0;j<this.npcs.length;j++){
        var n=this.npcs[j];
        if(n.type==='ped'){
            n.timer--;
            if(n.timer<=0){n.target=n.rot+(Math.random()-0.5)*Math.PI*1.5;n.timer=80+Math.random()*140;}
            n.rot+=(n.target-n.rot)*0.02;
            var nx2=n.x+Math.sin(n.rot)*n.spd,nz2=n.z+Math.cos(n.rot)*n.spd;
            if(Math.abs(nx2)<180&&Math.abs(nz2)<180){n.x=nx2;n.z=nz2;}else n.rot+=Math.PI;
        }else{
            n.trackT=(n.trackT+n.spd)%1;
            var pt=this.trkPt(n.trackT),pt2=this.trkPt((n.trackT+0.003)%1);
            n.x=pt.x;n.z=pt.z;n.rot=Math.atan2(pt2.x-pt.x,pt2.z-pt.z);
        }
    }

    if(this.started)this.gameTime=(performance.now()-this.startTime)/1000;
};

Game.prototype.startGame=function(){
    if(this.started)return;
    this.started=true;
    var ts=document.getElementById('title-screen');
    ts.style.transition='opacity 0.7s ease';
    ts.style.opacity='0';
    ts.style.pointerEvents='none';
    setTimeout(function(){ts.style.display='none';},750);
    this.startTime=performance.now();
    var self=this;
    requestAnimationFrame(function(t){self.loop(t);});
};

Game.prototype.loop=function(ts){
    var self=this;
    requestAnimationFrame(function(t){self.loop(t);});
    self.update(); self.render(); self.hud();
};

Game.prototype.flashCol=function(){
    var f=document.getElementById('collision-flash'),m=document.getElementById('collision-msg');
    f.classList.add('active');m.classList.add('show');
    setTimeout(function(){f.classList.remove('active');m.classList.remove('show');},400);
};

Game.prototype.hud=function(){
    var P=this.P,kmh=Math.round(Math.abs(P.spd)/0.12*120);
    document.getElementById('speedVal').textContent=kmh;
    document.getElementById('collCount').textContent=this.colCnt;
    var s=Math.floor(this.gameTime),m=Math.floor(s/60),sec=s%60;
    document.getElementById('raceTime').textContent=(m<10?'0'+m:m)+':'+(sec<10?'0'+sec:sec);
    var ctx=this.mmCtx,cx=80,cy=80,sc=1.7;
    ctx.fillStyle='#040c16';ctx.fillRect(0,0,160,160);
    ctx.strokeStyle='#2a3f55';ctx.lineWidth=6;ctx.beginPath();
    for(var i=0;i<=80;i++){var pt=this.trkPt(i/80);i===0?ctx.moveTo(cx+pt.x/sc,cy+pt.z/sc):ctx.lineTo(cx+pt.x/sc,cy+pt.z/sc);}
    ctx.closePath();ctx.stroke();
    for(var j=0;j<this.npcs.length;j++){
        var n=this.npcs[j];ctx.fillStyle=n.type==='car'?'#3377ff':'#33ff88';
        ctx.beginPath();ctx.arc(cx+n.x/sc,cy+n.z/sc,2,0,Math.PI*2);ctx.fill();
    }
    ctx.save();ctx.translate(cx+P.x/sc,cy+P.z/sc);ctx.rotate(-P.rot);
    ctx.fillStyle='#ff4400';ctx.beginPath();ctx.moveTo(0,-4);ctx.lineTo(-3,3);ctx.lineTo(3,3);ctx.closePath();ctx.fill();
    ctx.restore();
};

Game.prototype.renderShadows=function(){
    var gl=this.gl, L=this.L, self=this;
    gl.useProgram(this.prog);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    var objs=[{x:self.P.x,y:self.P.y,z:self.P.z,scale:1.4}];
    for(var i=0;i<this.npcs.length;i++){ var n=this.npcs[i]; if(n.type==='ped') objs.push({x:n.x,y:n.y,z:n.z,scale:0.8}); else objs.push({x:n.x,y:n.y,z:n.z,scale:1.2}); }

    // P3: Controlul camerei, lumina si umbre (S9) - Adaugarea unor stalpi de iluminat care produc umbre multiple (Aici se proiecteaza umbrele calculate din distanta la stalpi).
    for(var li=0; li<this.lights.length; li++){
        var lamp=this.lights[li];
        for(var oi=0; oi<objs.length; oi++){
            var o=objs[oi];
            var lx=lamp.x, ly=lamp.y, lz=lamp.z;
            var ox=o.x, oy=o.y, oz=o.z;
            var t = (0 - ly) / (oy - ly + 1e-6);
            var sx = lx + (ox - lx) * t;
            var sz = lz + (oz - lz) * t;
            var distLamp = Math.max(1, Math.sqrt((sx-lx)*(sx-lx)+(sz-lz)*(sz-lz)));
            var sX = o.scale * (1.4 + distLamp*0.02);
            var sZ = o.scale * (2.0 + distLamp*0.02);
            var mat = m4mul(m4tr(sx, 0.021, sz), m4sc(sX, 0.01, sZ));
            if(L.uM!==undefined) gl.uniformMatrix4fv(L.uM,false,mat);
            gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, self.T.shadow);
            if(L.uTex!==undefined) gl.uniform1i(L.uTex,0);
            gl.drawElements(gl.TRIANGLES, self.mBox.cnt, gl.UNSIGNED_SHORT, 0);
        }
    }
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
};

Game.prototype.render=function(){
    var gl=this.gl,self=this,L=self.L,SL=self.SL,P=self.P;
    gl.clearColor(0.04,0.08,0.18,1);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    var asp=self.canvas.width/self.canvas.height;
    var proj=m4persp(Math.PI/3,asp,0.1,900);

    var ca=P.rot+self.cam.ang,cd=this.cam.dist,ct=this.cam.tilt;
    var camX, camY, camZ;
    if(this.cam.mode==='follow'){
        camX = P.x - Math.sin(ca)*cd*Math.cos(ct) + this.cam.panX;
        camY = P.y + Math.sin(ct)*cd + 3;
        camZ = P.z - Math.cos(ca)*cd*Math.cos(ct) + this.cam.panZ;
    } else if(this.cam.mode==='top'){
        camX = P.x + this.cam.panX;
        camZ = P.z + this.cam.panZ;
        camY = P.y + this.cam.dist;
    } else {
        camX = (this.cam.panX||P.x);
        camZ = (this.cam.panZ||P.z);
        camY = (this.cam.panY!==undefined?this.cam.panY:10) + this.cam.dist*0.2 + 5;
    }

    var view;
    if(this.cam.mode==='top'){
        view = m4look(camX, camY, camZ, camX, 0, camZ);
    } else {
        // P3: Controlul camerei, lumina si umbre (S9) - Adaugarea controlului camerei pe toate cele trei axe si rotatii (Calculul si aplicarea View Matrix-ului in functie de rotatie).
        view = m4look(camX, camY, camZ, P.x, P.y, P.z);
    }

    gl.disable(gl.DEPTH_TEST);
    gl.useProgram(self.skyP);
    if(SL.uV!==undefined) gl.uniformMatrix4fv(SL.uV,false,view);
    if(SL.uP!==undefined) gl.uniformMatrix4fv(SL.uP,false,proj);
    if(SL.uTOD!==undefined) gl.uniform1f(SL.uTOD,self.tod);
    bindM(gl,self.mBox,SL);
    gl.enable(gl.DEPTH_TEST);

    gl.useProgram(self.prog);
    if(L.uV!==undefined) gl.uniformMatrix4fv(L.uV,false,view);
    if(L.uP!==undefined) gl.uniformMatrix4fv(L.uP,false,proj);

    var si=self.tod;
    if(L.uSunDir!==undefined) gl.uniform3f(L.uSunDir,0.4,0.6,-0.5);
    if(L.uSunCol!==undefined) gl.uniform3f(L.uSunCol,si*0.9,si*0.8,si*0.65);
    if(L.uAmb!==undefined) gl.uniform3f(L.uAmb,0.12+si*0.22,0.12+si*0.2,0.16+si*0.18);
    if(L.uFogCol!==undefined) gl.uniform3f(L.uFogCol,si>0.5?0.48:0.02,si>0.5?0.55:0.03,si>0.5?0.65:0.08);
    if(L.uFogD!==undefined) gl.uniform1f(L.uFogD,1.0);
    if(L.uLCnt!==undefined) gl.uniform1i(L.uLCnt,self.lights.length);

    var lPosFlat = new Float32Array(8*3);
    var lColFlat = new Float32Array(8*3);
    var lRadFlat = new Float32Array(8);

    for(var i=0;i<self.lights.length;i++){
        var lt=self.lights[i];
        lPosFlat[i*3] = lt.x; lPosFlat[i*3+1] = lt.y; lPosFlat[i*3+2] = lt.z;
        lColFlat[i*3] = lt.r; lColFlat[i*3+1] = lt.g; lColFlat[i*3+2] = lt.b;
        lRadFlat[i] = lt.rad;
    }

    if(L.uLP!==undefined) gl.uniform3fv(L.uLP, lPosFlat);
    if(L.uLC!==undefined) gl.uniform3fv(L.uLC, lColFlat);
    if(L.uLR!==undefined) gl.uniform1fv(L.uLR, lRadFlat);

    bindM(gl,self.mGnd,L); drwM(gl,self.mGnd,L,m4id(),self.T.grass);

    for(var j=0;j<self.roads.length;j++){
        var rm=self.roads[j];
        gl.bindBuffer(gl.ARRAY_BUFFER,rm.vbo);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,rm.ibo);
        if(L.aPos>=0) gl.vertexAttribPointer(L.aPos,3,gl.FLOAT,false,rm.str,0);
        if(L.aNorm>=0) gl.vertexAttribPointer(L.aNorm,3,gl.FLOAT,false,rm.str,12);
        if(L.aUV>=0) gl.vertexAttribPointer(L.aUV,2,gl.FLOAT,false,rm.str,24);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,self.T.road);
        if(L.uTex!==undefined) gl.uniform1i(L.uTex,0);
        gl.drawElements(gl.TRIANGLES,rm.cnt,gl.UNSIGNED_SHORT,0);
    }

    for(var k=0;k<self.statics.length;k++){
        var obj=self.statics[k];
        var m=m4mul(m4mul(m4tr(obj.px,obj.py,obj.pz),m4ry(obj.ry)),m4sc(obj.sx,obj.sy,obj.sz));
        bindM(gl,obj.mesh,L); drwM(gl,obj.mesh,L,m,obj.tex);
    }

    bindM(gl,self.mBox,L);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,self.T.shadow);
    if(L.uTex!==undefined) gl.uniform1i(L.uTex,0);
    this.renderShadows();

    self.drawCar(P.x,P.y,P.z,P.rot,self.T.carRed,true);
    for(var m=0;m<self.npcs.length;m++){
        var n=self.npcs[m];
        if(n.type==='ped') self.drawPed(n.x,n.y,n.z,n.rot,n.tex);
        else self.drawCar(n.x,n.y,n.z,n.rot,n.tex,false);
    }
};

Game.prototype.drawCar=function(x,y,z,rot,tex,isPlayer){
    var gl=this.gl,L=this.L,self=this;
    var base=m4mul(m4tr(x,y,z),m4ry(rot));
    bindM(gl,self.mBox,L);
    drwM(gl,self.mBox,L,m4mul(base,m4sc(1.6,0.55,3.5)),tex);
    drwM(gl,self.mBox,L,m4mul(m4mul(base,m4tr(0,0.45,-0.2)),m4sc(1.3,0.45,2.0)),isPlayer?self.T.glass:tex);
    bindM(gl,self.mWheel,L);
    var wp=[[-0.85,-0.2,1.2],[0.85,-0.2,1.2],[-0.85,-0.2,-1.2],[0.85,-0.2,-1.2]];
    for(var i=0;i<4;i++) drwM(gl,self.mWheel,L,m4mul(m4mul(m4mul(base,m4tr(wp[i][0],wp[i][1],wp[i][2])),m4rx(Math.PI/2)),m4sc(0.6,0.6,0.55)),self.T.black);
    bindM(gl,self.mBox,L);
    drwM(gl,self.mBox,L,m4mul(m4mul(base,m4tr(-0.5,0,1.76)),m4sc(0.25,0.2,0.15)),self.T.yellow);
    drwM(gl,self.mBox,L,m4mul(m4mul(base,m4tr( 0.5,0,1.76)),m4sc(0.25,0.2,0.15)),self.T.yellow);
    drwM(gl,self.mBox,L,m4mul(m4mul(base,m4tr(-0.5,0,-1.76)),m4sc(0.25,0.2,0.15)),self.T.red);
    drwM(gl,self.mBox,L,m4mul(m4mul(base,m4tr( 0.5,0,-1.76)),m4sc(0.25,0.2,0.15)),self.T.red);
};

Game.prototype.drawPed=function(x,y,z,rot,tex){
    var gl=this.gl,L=this.L,self=this;
    var base=m4mul(m4tr(x,y,z),m4ry(rot));
    bindM(gl,self.mBox,L);
    drwM(gl,self.mBox,L,m4mul(base,m4sc(0.4,1.0,0.3)),tex);
    drwM(gl,self.mBox,L,m4mul(m4mul(base,m4tr(0,0.7,0)),m4sc(0.3,0.3,0.3)),self.T.white);
};

window.addEventListener('load',function(){ window._game=new Game(); });