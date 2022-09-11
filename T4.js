 
var eid_charset = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_"    
var Swapping_Nodes = ["Swapping Node Index","Format","index of Polygon ID A", "index of Polygon ID B relative to A + 1", "index of Polygon ID C relative to A","index of Polygon ID D relative to C + 17"]

var Removing_Nodes = ["Removing Node Index", "Copy Flag", "World Index", "Polygon Index"];
var Adding_Nodes = ["Adding Node Index", "Copy Flag", "World Index", "Polygon Index"];

var Swapping_Format = ["A", "B"];

function eidtoname(value) {
    let char1 = ((value >>> 25) & 0x3F)
    let char2 = ((value >>> 19) & 0x3F)
    let char3 = ((value >>> 13) & 0x3F)
    let char4 = ((value >>> 7) & 0x3F)
    let char5 = ((value >>> 1) & 0x3F)
    return eid_charset[char1] + eid_charset[char2] + eid_charset[char3] + eid_charset[char4] + eid_charset[char5];
};

function testbit(v, i) {
    return (v & i) == i;
};

function u8(n) {
    return n & 0xFF;
};

function u16(n) {
    return n & 0xFFFF;
};

function u32(n) {
    return n & 0xFFFFFFFF;
};

function int8(value) {
    value = u8(value);
    let a = (value & 0x80) == 0x80; 
    let b = value & 0x7F;
    return a && -0x80 + b || !a && b;
};

function int16(value) {
    value = u16(value);
    let a = (value & 0x8000) == 0x8000;
    let b =  value & 0x7FFF;
    return a && -0x8000 + b || !a && b;
}; 

function int32(value) {
    value = u32(value);
    let a = (value & 0x80000000) == 0x80000000;
    let b =  value & 0x7FFFFFFF;
    return a && -0x80000000 + b || !a && b;
}; 

function sint32(value) {
    let numbers = value & 0x7FFFFFFF;
    return Math.abs(value) != value && (0^numbers) + 0x80000000 || numbers;
};

function ReadU16(index, address) {
    return (index[address + 1] << 8) | index[address];
};

function ReadU24(index, address) {
    return (index[address + 2] << 16) | (index[address + 1] << 8) | (index[address]);
};

function ReadU32(index, address) {
    return (index[address + 3] << 24) | (index[address + 2] << 16) | (index[address + 1] << 8) | (index[address]);
};

function BReadU32(index, address) {
    return (index[address] << 24) | (index[address + 1] << 16) | (index[address + 2] << 8) | (index[address + 3]);

};

function ReverseOrder32(value) { 
    return (value & 0xFF000000) >>> 24 | (value & 0xFF0000) >>> 8 | (value & 0xFF00) << 8 | (value & 0xFF) << 24
}

var input = document.getElementById("file");

function openfile(evt) {
  var files = input.files;
  fileData = new Blob([files[0]]);
  var promise = new Promise(getBuffer(fileData));
  promise.then(function(data) {
        init(data)
    })
    .catch(function(err) {
    console.log('Error: ',err);
  });
};

function getBuffer(fileData) {
    return function(resolve) {
    var reader = new FileReader();
    reader.readAsArrayBuffer(fileData);
        reader.onload = function() {
            var arrayBuffer = reader.result
            var bytes = new Uint8Array(arrayBuffer);
            resolve(bytes);
        };
    };
};

input.addEventListener('change', openfile, false);


function table__Object() {
    let t = Object.create(constructortable);
    t.object = document.createElement('table');
    t.tableRow = null;
    t.tableCell = null;
    return t;
};

var constructortable = {
    insertRow: function() {
        this.tableRow = this.object.insertRow();
        return this.tableRow;
    },
    insertCell: function() {
        this.tableCell = this.tableRow.insertCell();
        this.tableCell.style.border = "1px solid black";
        return this.tableCell;
    },
    CellText: function(text) {
        this.tableCell = this.tableRow.insertCell();
        this.tableCell.style.border = "1px solid black";
        this.tableCell.appendChild(document.createTextNode(text));
    }
}


function offset(index, addressA, addressB) { 
    let d = [];
    for (x=addressA; x<addressB; x++) {
        d.push(index[x]);
    };
    return d
};



function entry(data) {
    let magic_number = ReadU32(data, 0);
    if (magic_number != 0x100FFFF) {
        alert("Oh uh! Magic number doesn't match the file!");
    };
    let EID = ReadU32(data, 0x4);
    let Type = ReadU32(data, 0x8);
    let ItemCount = ReadU32(data, 0xC);
    let ItemOffsets = [];
    let Items = [];
    if (ItemCount != 0) {
        for (i = 0; i<ItemCount; i++) {
            ItemOffsets.push(ReadU32(data, 0x10 + (i * 4)));
        };
    } else {
          alert("There's no items in enty data.");
    };
    for (i = 0; i<ItemOffsets.length; i++) {
        let item1 = ItemOffsets[i];
        let item2 = ItemOffsets[i + 1];
        if (item1 && item2) {
           Items.push(offset(data, item1, item2));
        };
        if (item1 && !item2) {
            Items.push(offset(data, item1, data.length));
        };
    };
        return {
            Type: Type, 
            EID: eidtoname(EID), 
            Items: Items
        };
};

function SLST__Source(size, data) {
    let polygons_ids = [];
    for (i = 0; i<size; i++) {
        let value = ReadU16(data, 0x4 + (i * 0x2));
        let world = (value & 0x7000) >>> 12;
        let polygon = (value & 0xFFF);
        polygons_ids.push({
            world: world,
            polygon: polygon
        });
    };
    return polygons_ids;
};

function SLST__Delta(size, data) {
    const Left = document.getElementById("Leff");
    const Right = document.getElementById("Rigg");
    const Cenn = document.getElementById("Cenn");
    let delta_size = size;
    let addnodeindex  = ReadU16(data, 0x4);
    let swapnodeindex  = ReadU16(data, 0x6)

    let Delta = {
        removenodes: [],
        addnodes: [],
        swapnodes: []
    };

    for (i=0;i<addnodeindex-2;i++) {
        Delta.removenodes[i] = ReadU16(data,8 + i * 2);
    };
    for (i=addnodeindex-2,j=0;i<swapnodeindex-2;i++,j++) {
        Delta.addnodes[j] = ReadU16(data,8 + i * 2);
    };
    for (i=swapnodeindex-2,j=0;i<delta_size-2;i++,j++) {
        Delta.swapnodes[j] = ReadU16(data,8 + i * 2);
    };

    // ISSSSNNN NNNNNNNN 
    // 0x8000



    let skip_count
    let skip_index
    let index

    let length = 0


    let remove_nodes = table__Object();
    remove_nodes.object.style.border = '1px solid black';
    remove_nodes.insertRow();
    for (i = 0; i<Removing_Nodes.length; i++) {
        let info = Removing_Nodes[i];
        let cell = remove_nodes.insertCell();
        cell.appendChild(document.createTextNode(info));
    };


    for (i = 0; i<Delta.removenodes.length;i++) {
        let value = Delta.removenodes[i];
        if (length == 0) {
        
             skip_count = (value & 0xF000) >>> 12;
             skip_index = (value & 0xFFF);
             index = i;

            length = 1 + skip_count;
            if (value == 0xFFFF) {
                length = 0
                break;
            };
        } else {
    
                length -= 1;
                let copy = (value & 0x8000) >>> 15;
                let world = (value & 0x7000) >>> 12;
                let polygon = (value & 0xFFF);
                remove_nodes.insertRow();
                remove_nodes.CellText(index);
                remove_nodes.CellText(copy);
                remove_nodes.CellText(world);
                remove_nodes.CellText(polygon);
         //       console.log(`remove polyid`,"value",value,"world", world, "polygon", polygon, "copy",copy)      
       
            };
    };
    console.log("length",length)



    let add_nodes = table__Object();
    add_nodes.object.style.border = '1px solid black';
    add_nodes.insertRow();
    for (i = 0; i<Adding_Nodes.length; i++) {
        let info = Adding_Nodes[i];
        let cell = add_nodes.insertCell();
        cell.appendChild(document.createTextNode(info));
    };


    for (i = 0; i<Delta.addnodes.length;i++) {
        let value = Delta.addnodes[i];
        if (length == 0) {
        
             skip_count = (value & 0xF000) >>> 12;
             skip_index = (value & 0xFFF);
             index = i;

            length = 1 + skip_count;
            if (value == 0xFFFF) {
                length = 0
                break;
            };
        } else {
                length -= 1;
                let copy = (value & 0x8000) >>> 15;
                let world = (value & 0x7000) >>> 12;
                let polygon = (value & 0xFFF);
                add_nodes.insertRow();
                add_nodes.CellText(index);
                add_nodes.CellText(copy);
                add_nodes.CellText(world);
                add_nodes.CellText(polygon);
       //         console.log(`add polyid`,"value",value,"world", world, "polygon", polygon, "copy",copy)      
       
            }; 

    };
    let swap_nodes = table__Object();
    swap_nodes.object.style.border = '1px solid black';
    swap_nodes.insertRow();
    for (i = 0; i<Swapping_Nodes.length; i++) {
        let info = Swapping_Nodes[i];
        let cell = swap_nodes.insertCell();
        cell.appendChild(document.createTextNode(info));
    };


    for (i = 0; i<Delta.swapnodes.length;i++) {
        let value = Delta.swapnodes[i];
        if (value == 0xFFFF) {
            break;
        };
        swap_nodes.insertRow();
        let test16 = testbit(value, 0x8000);
        let test15 = testbit(value, 0x4000);

        if (test16 == true) {
            // FORMAT A
            console.log("FORMAT A")
            let B = (value & 0x7800) >>> 11;
            let A = (value & 0x7FF)
            swap_nodes.CellText(i);
            swap_nodes.CellText(Swapping_Format[0]);
            swap_nodes.CellText(A);
            swap_nodes.CellText(B);

            let byte2 = Delta.swapnodes[i + 1];

            let __test16 = testbit(byte2, 0x8000);
            let __test15 = testbit(byte2, 0x4000);
            if (__test16 == false && __test15 == true) {
                // another one
                console.log("FORMAT A again")
                let C = (byte2 & 0x3FE0) >>> 5;
                let D = (byte2 & 0x1F);
                swap_nodes.CellText(C);
                swap_nodes.CellText(D);
                i += 1;
            };
        };

        if (test16 == false && test15 == false) {
            // FORMAT B
            let A = (value & 0xFFF);
            let byte2 = Delta.swapnodes[i + 1];
            let __test16 = testbit(byte2, 0x8000);
            let __test15 = testbit(byte2, 0x4000);
            if (__test16 == false && __test15 == false) {
                console.log("FORMAT B")

                let B = (byte2 & 0xFFF);
                swap_nodes.CellText(i);
                swap_nodes.CellText(Swapping_Format[1]);
                swap_nodes.CellText(A);
                swap_nodes.CellText(B);

                let byte3 = Delta.swapnodes[i + 2];
                let ___test16 = testbit(byte3, 0x8000);
                let ___test15 = testbit(byte3, 0x4000);
                if (___test16 == false && ___test15 == true) {
                    // another one
                    console.log("FORMAT B again")
                    let C = (byte3 & 0x3FE0) >>> 5;
                    let D = (byte3 & 0x1F);
                    swap_nodes.CellText(C);
                    swap_nodes.CellText(D);
                    i += 2;
                } else {
                    i += 1;
                };
            } else {
                console.log("ZADD")
            };
        };



    };
    Cenn.appendChild(remove_nodes.object);
    Left.appendChild(swap_nodes.object);
    Right.appendChild(add_nodes.object);
    return Delta;

};

function SLST__Item(item) {
    let List_Size = ReadU16(item, 0);
    let List_Type = ReadU16(item, 0x2);
    switch (List_Type) { 
        case 0:
            // Source
            return SLST__Source(List_Size, item);
        case 1:
            // Delta-encoded
            return SLST__Delta(List_Size, item);
    };
};

function init(data) {
    input.remove();
    let __T4 = entry(data);
    
    if (__T4.Type != 4) {
        alert("Entry is not SLST.");
    };

    console.log(SLST__Item(__T4.Items[1]));

};