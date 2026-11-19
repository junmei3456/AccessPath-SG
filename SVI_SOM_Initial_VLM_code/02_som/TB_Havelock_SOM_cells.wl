(* ::Package:: *)
(* Tiong Bahru-Havelock SVI SOM: cells that replace the matching parts of Week02_SOM_for_Images.nb.
   Before running: open and evaluate Week02_SearchEngine_Background_codes.nb.
   Paste the cells one at a time, or run this whole file with Get[]. *)

(* ===== Cell 1: folders (replaces the two SystemDialogInput lines) ===== *)
imagefolder = "G:\\0-NUS\\Sem1\\AR5958A\\Final Project\\DATA\\SVI scrap\\svi_output\\svi_images";
workingfolder = "G:\\0-NUS\\Sem1\\AR5958A\\Final Project\\SOM\\output_TB";
Quiet@CreateDirectory[workingfolder];
paths = FileNames["*.jpg", imagefolder];
Length@paths

(* ===== Cell 2: feature extraction (replaces images = ParallelTable and vecFE = FEFunction /@ images) =====
   Loads the network once, reads images in batches, saves progress. Can be stopped and rerun. CPU only. *)
feNet = NetTake[NetModel["Wide ResNet-50-2 Trained on ImageNet Competition Data"], {1, 22}];
vecFile = FileNameJoin[{workingfolder, "vecFE.mx"}];
vecFE = If[FileExistsQ@vecFile, Import@vecFile, {}];
doneNames = Association[Thread[vecFE[[All, 1]] -> True]];
todo = Select[paths, ! KeyExistsQ[doneNames, FileNameTake@#] &];
batches = Partition[todo, 32, 32, 1, {}];
Do[
  Module[{b = batches[[n]]},
    vecFE = Join[vecFE, Thread[(FileNameTake /@ b) -> (Flatten /@ feNet[Import /@ b, BatchSize -> 8, TargetDevice -> "CPU"])]];
    If[Mod[n, 20] == 0 || n == Length@batches, Export[vecFile, vecFE]; Print[Length@vecFE, " / ", Length@paths]]],
  {n, Length@batches}];
vecFE = SortBy[vecFE, First];
Length@vecFE

(* ===== Cell 3: vectors and duplicate images (replaces imgveclist = ... ; imgpathlist = ...) =====
   Identical files are left out of training and put back when images are assigned to cells. *)
imgveclist = vecFE[[All, 2]];
imgpathlist = vecFE[[All, 1]];
fileHash = FileHash[FileNameJoin[{imagefolder, #}], "MD5"] & /@ imgpathlist;
uniqueIdx = First /@ Values@PositionIndex[fileHash];
trainvec = imgveclist[[uniqueIdx]];
{Length@imgveclist, Length@trainvec}

(* ===== Cell 4: training (replaces x = 10 ... and somKernel["weights"] = IDtrain[...]) =====
   Differences from IDtrain: all unique images in each iteration instead of 1000, sigma never below 0.5
   so neighbouring cells stay related, a fixed random seed, and no error < 0.4 stop. *)
IDtrainFull[som_, vec_, ite_] := Block[{weights = som["weights"], distances = som["distances"], dim, somLen = som["dimensions", "len"], sig, bmus, ns, allNS, nst, error},
   dim = Max[som["dimensions", "x"], som["dimensions", "y"]];
   Do[
    sig = Max[0.5, N[(1 - u/(ite + 1)) dim/4]];
    bmus = Flatten@Nearest[MapIndexed[#1 -> #2[[1]] &, weights], vec, 1];
    ns = Exp[-(distances[[#]])^2/(2 sig^2)] & /@ bmus; allNS = Total@ns; nst = Transpose@ns;
    weights = Total[vec*nst[[#]]]/allNS[[#]] & /@ Range[somLen];
    error = Mean@Table[EuclideanDistance[vec[[h]], weights[[bmus[[h]]]]], {h, Length@vec}];
    Print["iteration ", u, "  sigma=", NumberForm[sig, 3], "  error=", NumberForm[error, 5]],
    {u, 0, ite}];
   weights];
SeedRandom[5958];
x = 10; y = 10; d = Length@First@trainvec;
somKernel = IDcreate[y, x, d];
somKernel["weights"] = IDtrainFull[somKernel, trainvec, 20];
Print["QE on all images: ", IDerror[somKernel, imgveclist]];

(* ===== Cell 5: assign all images, check cells ===== *)
imgsom = GetSOM[imgveclist, somKernel, imgpathlist];
cellCounts = Length /@ imgsom["eventListSorted"];
Print["images: ", Total@cellCounts, " | empty cells: ", Count[cellCounts, 0], " | smallest non-empty: ", Min@DeleteCases[cellCounts, 0], " | largest: ", Max@cellCounts];
Export[FileNameJoin[{workingfolder, "imgSOM.mx"}], imgsom];

(* ===== Cell 6: one row per image, to join with the GeoJSON by image_id =====
   Replaces the Week06 export: its name parsing would turn every sample_id into "TB". *)
ny = somKernel["dimensions", "y"];
cellOf = Association[Thread[imgpathlist[[imgsom["bmus"][[All, 1]]]] -> imgsom["bmus"][[All, 2]]]];
vecOf = Association[Thread[imgpathlist -> imgveclist]];
rows = Table[Module[{id = FileBaseName@f, c = cellOf[f]},
    {id, StringDrop[id, -2], StringTake[id, -1], c, Quotient[c - 1, ny] + 1, Mod[c - 1, ny] + 1, Round[EuclideanDistance[vecOf[f], somKernel["weights"][[c]]], 0.001], If[MemberQ[uniqueIdx, First@FirstPosition[imgpathlist, f]], 0, 1]}], {f, imgpathlist}];
Export[FileNameJoin[{workingfolder, "SOM_cells.csv"}], Prepend[rows, {"image_id", "sample_id", "side", "cell", "row", "col", "dist_to_cell", "is_duplicate"}]];
Export[FileNameJoin[{workingfolder, "SOM_cell_review.csv"}], Prepend[Table[{c, cellCounts[[c]], ""}, {c, Length@cellCounts}], {"cell", "n_images", "visual_class"}]];

(* ===== Cell 7: review sheet per cell (replaces renderimginbmu for screening) =====
   renderimginbmu shows the first images in a cell, which are the lowest IDs, so one area can look like the whole cell.
   These sheets take a random 16, up to 25 where the cell is large. Label visual_class in SOM_cell_review.csv. *)
sheetDir = FileNameJoin[{workingfolder, "cell_sheets"}];
Quiet@CreateDirectory[sheetDir];
SeedRandom[5958];
Do[
  With[{names = imgsom["eventListSorted"][[c]]},
    If[names =!= {},
      Module[{pick = RandomSample[names, Min[Length@names, If[Length@names > 80, 25, 16]]], n, tiles},
        n = Ceiling@Sqrt@Length@pick;
        tiles = ImagePad[ImportCropedImage[FileNameJoin[{imagefolder, #}], 220], 2, White] & /@ pick;
        tiles = PadRight[tiles, n*Ceiling[Length@tiles/n], {ConstantImage[White, {224, 224}]}];
        Export[FileNameJoin[{sheetDir, "cell_" <> IntegerString[c, 10, 3] <> "_n" <> ToString@Length@names <> ".jpg"}], ImageAssemble@Partition[tiles, n]]]]],
  {c, Length@cellCounts}];

(* ===== Cell 8: overview figures. Run in the notebook interface, where they display. ===== *)
Export[FileNameJoin[{workingfolder, "SOM_weights.png"}], ImageResize[rendercellWeights[imgsom, "DarkRainbow"], 600, Resampling -> "Nearest"]];
Export[FileNameJoin[{workingfolder, "SOM_one_image_per_cell.png"}], rendercellimg[imgsom, imagefolder]];
Export[FileNameJoin[{workingfolder, "SOM_cell_counts.png"}], rendercellq[imgsom], ImageResolution -> 200];
