# Docker quick start
---

```
version: '3.8'
services:
  backend:
    image: acgtic211/things-generator-backend:1.0.0
    container_name: things-generator-backend
    environment:
      - FLASK_RUN_HOST=0.0.0.0
      - FLASK_RUN_PORT=5000
    ports:
      - "5000:5000"


  frontend:
    image: acgtic211/things-generator-frontend:1.0.0
    container_name: things-generator-frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://0.0.0.0:5000
```

## Application usage
The application has 3 pages divided by functionality:
- Generate a file
- Generate nodes / Generate random files
- Generate multiple files

### Main page
![Main page](imgs/Screenshot%202025-01-31%20111002.png)
The main page shows the two main options of the application. By clicking on one of them, you can access the functionalities to generate a single file or several files separately.
### Generate a file
![Generate a single file](imgs/Screenshot%202025-01-31%20110447.png)
In generate single file, as the name suggests, the creation of a file is performed based on the chosen type and this can be edited in two ways: by using the options in the left panel or by writing directly to the file. Step by step:

#### 1. Choose the type of device (“Scheme”) to be generated.
1. **Select the scheme type**: You will see a drop-down (menu) with different device types (e.g. _Bulb_, _Motion sensor_, _Door_, etc.).
2. **Click** on the menu and choose the device that best fits what you want to create or modify.

---

#### 2. Generate a base file
1. Once the device type has been selected in the menu, click on the **"Generate file ”** button.
2. The application will create a sample file with the main information for that device.
3. On the **right** side of the screen, in the **text editor**, you will see the content of the newly generated file (in JSON code).

---

#### 3. Upload a file of your own (optional)
If you already have a file saved on your computer with a device description and you want to modify or revise it:

1. click on the **"Choose file"** (or "Upload file") button.
2. Select your JSON file from your computer.
3. The application will display it in the editor (on the right) and, if it can identify what type of device it is, it will update the selection menu with that type.
    - If it does not recognize it, it will try to “guess” the type and warn you.

---

#### 4. Choose the properties you want to modify
1. Under “Choose the properties to modify”, you will see another drop-down menu (e.g. _properties_, _actions_, etc.).
2. Choose from that menu the section you want to adjust. Normally, for a light bulb, you can find **properties** like “lightOn”, “status”, “led”, etc.
3. Immediately, you will see a group of “chips” (small labels) representing **properties** that you could add or remove in the file.
4. **Click** on the chips you want to **include** in your file.
    - If you click again on a marked chip, you will deselect it.

---

#### 5. Adjust the range with the slider
1. Below the chips, you will find a **slider** with a range starting at 0 and ending at the number of chips you chose.
2. This **range** indicates how many of the selected properties you finally want to include.
    - For example: if you selected 3 properties and move the slider to the range **“1 - 3”**, it means that the application could take between 1 and 3 of those properties for the file.
    - If you set the range to **“0 - 2”**, then it will include between 0 and 2 of the properties you chose.
3. The final number (for example, “Range selected: 0 - 2”) appears below the slider so that you know which values you selected.

---

#### 6. Modify the file
1. When you are satisfied with the selection of properties and you have set the range in the slider, click on the **"Modify ”** button.
2. The application will internally create a new version of the file with the changes you requested.
3. You will see the result immediately to the right, in the text editor.
    - There you will notice how the properties you chose have been added or removed.

---

#### 7. Review the file in the editor (right column)
In the right pane, the final content of the file in JSON format is displayed in real time. In general, in the final file you can see:

- **"id ”** of the device (identifier).
- **“description”** (a short description).
- Sections like **"properties ‘** or **’actions ”**, where the details you selected appear.

If you want to change something manually, you can type it directly in the editor.

---

#### 8. Save the file
Once you are satisfied:

1. Click the **"Save"** button.
2. The system will download to your computer a file named, for example, **"modified_file.json"** with all the changes made.

---

#### 9. Home page

If you want to **go back to the start** of the application or change sections, click on **"Home Page"** to return to the initial screen.


---

#### Summary of the main steps

1. **Select device type** in the first menu.
2. **Generate file** to see a sample schematic (it will appear in the editor).
3. (Optional) **Upload** your file from your computer.
4. Choose in the second menu the **properties** or the section you want to modify (properties, actions, etc.).
5. **Select the properties** (chips) you are interested in.
6. Adjust the **range** with the slider (how many of those properties will be included).
7. Click **"Modify"** to apply the changes.
8. Review the file in the **editor** on the right.
9. Click **"Save"** to download the file with your changes.
10. Press **"Home page ”** to return to the top.
### Generate nodes
#### 1. Main screen: “Generate Files”.
When you enter this option, you will see a **title** that says “Generate Files”. Below it you will see **two options**:

1. **Generate Custom Nodes** 2.
2. **Generate Random Files**.

Select the one you need depending on what you want to do:

- **Option 1:** “Generate Custom Nodes”.  
    This section is used to create a specific number of nodes to then go to Generate Multiple Files (page we will see later).
    
- **Option 2:** “Generate Random Files”.  
    Here you will be able to configure, for each node, certain device “types” and how many files (JSON) will be randomly generated with those types.
    

The application is therefore divided into **two main screens** depending on the option chosen. They are explained separately below.

---

#### 2. Generate Custom Nodes
![Generate custom nodes](imgs/Screenshot%202025-01-31%20112308.png)

1. **Choose number of nodes to generate**.  
    You will see a box where you can type a number, for example “1”, “2”, “3”...
    
    - Indicate how many nodes you want to create.
    - For example, if you enter “2”, the system will create two nodes called `node_0` and `node_1`.
2. **Button “Generate Nodes ”**.  
    When you click it, the application will tell the server how many nodes to create. You will receive a confirmation message if everything goes well.
    
3. **Home page**.
    
    - Below the “Generate Nodes” button there is another button called “Home Page”.
    - It takes you back to the home screen of the application in case you want to change mode or exit.

**What happens next?**
- Once the nodes are generated, the application sends you to “Generate multiple files”.

---

#### 3. Generate Random Files
![Generate random files](imgs/Screenshot%202025-01-31%20112356.png)

This is the most extensive part with the most options. When you select the “Generate Random Files” option, you will see several blocks:

##### 3.1. Generate Nodes.
- **Number of nodes**: Here you choose how many nodes you want to create (for example, “1”).
- **"Generate Nodes" button**: Creates in the background the necessary folders and ‘nodes’ on the server.
- **Upload JSON files (custom TDs)**:
    - If you have JSON files on your computer (e.g. device descriptions that you created yourself), you can upload them here so that the system takes them into account when creating the files.
    - After uploading one or more files, the application will confirm if they have been uploaded correctly.

##### 3.2. Node configurations
Once the nodes have been generated, a section called “Configurations per Node” appears. For example:

- `nodo_0`
- `nodo_1`
- etc.

Within each **node**:
1. **Location**.
    - You can type a word such as “university”, “home”, “office”, etc.
    - It serves to specify where the devices generated by this node will be virtually located.
2. **"Add Type"** button
    - Each node can have several **device types**. For example, “Light bulb”, “Door”, “Temperature sensor”, etc.
    - When you click “Add Type”, a new row will appear where you configure:
        - **Type** (selected from a drop-down menu that includes both “Global” types and the “Custom” ones you uploaded from your JSON files).
        - **NumFiles**: The number of JSON files you want to generate for that particular type.
3. **Delete a Type**.
    - If you add a type and you make a mistake, you have a little “trash” (or “x”) button to remove it.

Repeat these steps for each node you have. So, for example, the same node can generate 2 files of type “Light bulb” and 1 of type “Humidity sensor”.

| Note: If you generate a number of nodes, when generating files you have to have all options for each node completed, i.e. a location and at least one type with a number of files.

---

##### 3.3. Finish buttons
After configuring the location and types for each node, you will see several buttons:
1. **Generate Files**.
    - Creates on the server all the JSON files requested for each node and type.
    - It will show you a summary in the right column, indicating how many files have been created, their names, and which properties/actions were included.
2. **Download ZIP**
    - Once generated, you can download **all** of these files in a single ZIP file.
    - When clicked, the browser will download one file (usually named `generated_files.zip`).
3. **Structure Preview**.
    - Displays a **file browser** in the right pane.
    - You will see a kind of tree:
        - Each **node** (for example, `node_0`) as a folder.
        - Inside that folder, a subfolder for each **type** (e.g. `light`, `door`, etc.).
        - Inside the subfolder, each **JSON file** that has been generated.
    - You can click on a file name to “open” it and view its contents.
4. **Home page**.
    - Returns to the home screen of the application.

---

##### 3.4. Opening and editing a file (from the Preview)
![Preview](imgs/Screenshot%202025-01-31%20113949.png)

When you click on a file from the tree (for example, `acg_home_light165.json`):
1. **An edit (modal) window will open** 2.
    - It will display the JSON content in a text editor.
    - If you want, you can modify it manually (be careful not to break the JSON structure!).
2. **Save Changes**.
    - When you click “Save Changes”, the application sends those modifications to the server and updates the file.
    - It will notify you if it was successfully saved.
3. **Cancel**.
    - Closes the window without saving.

---

#### Summary of most common uses
1. **Generate one or more “nodes”**.
2. In each node, indicate its **location** and the **types** of device you want to generate.
3. For each type, put how many JSON files are going to be automatically created.
(Optional) **Upload your own JSON files** before, so that the system uses them as templates or references (“Custom: ...”).
5. Click on **"Generate Files”** and see on the right side the **summary** of what has been generated.
6. Download the **ZIP** with all the files.
    - Or, if you prefer, click on **"Preview Structure”** to browse and open them individually.
7. If you decide to **open and edit** a specific file, a window will be displayed to modify its contents and **save** it.
8. Finally, you can return to the **"Home Page"**.

---

#### 5. Final considerations
- If you do not see the files** in the preview or in the ZIP, check that you have clicked **"Generate Files”** and have not received errors.
- **The location** you type in each node (e.g. “university”) will be reflected in the JSON files as part of the description (“Device located in university”).

### Generate multiple files
![Generate multiple files](imgs/Screenshot%202025-01-31%20114255.png)

#### 1. Main screen
When you enter this section, you will see in the **left column** several fields and buttons that will allow you to:

1. upload personal JSON files.
2. Choose the node (or destination) where the information will be saved.
3. Choose the type of device (schema).
4. Select the properties that you want to add or modify in those devices.
5. Define locations (e.g. “university”, “home”) and how many files will be generated for each location.

In the **right column**, you will see a summary box where your selections will be listed and finally you will have the option to **generate** and **download** those files, as well as **preview** them.

---
#### 2. Load custom JSON files (optional)
1. At the top left, you will find the **"Choose files"** (or "Load JSON files") button.
2. Select one or several files with extension `.json` from your computer.
3. Press the **"Upload file"** button.
    - You will see a success notification if they have been successfully uploaded.
    - This is for the application to recognize “custom” device types that are not included in its “global” catalog.

---
#### 3. Select destination node
Below the button to load files, there is a drop-down menu to choose the **node** where the files will be saved.

- If the list is empty or your node does not appear, you may need to first go to the section of the application where **generate nodes** (in this case, “Generate Custom Nodes”).
- Select from that menu the desired node, e.g. “node_0”.

---
#### 4. Choosing the type of scheme (device)
In the next drop-down menu, you will see different types recognized by the application, such as:

- _light_ (Light bulb)
- _movement_ (Motion sensor)
- ... or the “Custom” types you have uploaded.

Select one, for example, “light”.

---
#### 5. Choose the properties to be modified
Once you have selected the schematic type, the application will automatically load the **available properties** (they can be called “actions”, “properties”, etc.).

- Choose one from the drop-down list (e.g. “actions”) that you want to modify.

---
#### 6. Select elements (chips)
Just below, the application will show some “chips” (small labels with names like `ledon`, `lightOn`, `switch`, etc.), which are the **elements** available within the chosen property.
1. **Click** on the chips you are interested in (they will be marked in a different color to indicate that they are selected).
2. **Range slider**: set how many of these elements you want to appear in the file (e.g. “0 to 3”).
    - This means that, when the files are generated, between 0 and 3 of these randomly selected elements will be included.

---
#### 7. File locations and number of files
Below the chips, you will see a section for **"Locations"**. There you can:
1. Type in a location name (e.g. “university”).
2. Specify the number of files to be generated for that location (e.g. “10”).
3. Click **"Add location”** if you want more than one location (each with its own number of files).
4. If you make a mistake, you can delete a location with the trash can button.

---
#### 8. Save Selection
When you are satisfied with:

- **Node** you chose.
- **Type** of schema.
- **Property** (actions/properties) and the **chips** checked.
- **Range** (0-3, 1-2, etc.).
- **Locations** and the number of files per location...

Press the **"Save Selection ”** button for the application to remember it.

- Your selection will appear on the **right**, in a **table** under the columns: “Node”, “Type”, “Selected attributes”, “Elements”, “Range”, “Locations” and “Actions”.

If you want to **edit** that selection (e.g., change some chip) or **delete** it, you can use the pencil or trash can icons in the “Actions” column.

You can repeat these steps to create **different selections** in the same node or other nodes (for example, the same node with “light/actions” and also “light/properties”).

---
#### 9. Generate Files
When you have all the selections you want in the table, use the final buttons:
1. **Generate Files**
    - Send the configuration to the server, which will create all the corresponding JSON files according to your ranges and locations.
    - A **Summary** will appear (on the right) indicating how many files have been created for each node, what properties have been included, etc.
2. **Download ZIP**
    - Download, in a single compressed file, all the generated files.
3. **Show Preview**.
    - Display a **explorer** of files in the right section.
    - You will be able to expand “node_0” → “light” → view each JSON.
    - Clicking on a file name will open it in an **editor** where you can view and modify its contents if you wish.
4. **Home page**.
    - Takes you back to the start of the application.

---
#### 10. Opening and editing a file
If you click on one of the files in the preview (e.g. `acg_home_light80`):
1. A **modal** will open where you see the JSON content.
2. You can **edit** it manually (changing values, adding sections, etc.).
3. Press **"Save Changes ”** to send the update to the server (the system will warn if it was saved correctly).
4. Or click **"Cancel"** to close without saving.

---
#### 11. Final recommendations
- If something does not appear in the summary, make sure you have clicked **"Save Selection"** before ’Generate Files”.
- Verify that for each location you have specified a number of files greater than **0**.
- The range slider “0-3” (for example) indicates that the system will randomly choose between 0 and 3 of the selected chips for each file.
- You can make as many selections as you want for the same node or for multiple nodes, with the same or different location.
- You can group several selections of “chip” elements with their ranges for the same property. If for the type “light”, the property “actions”, you have “ledon”, “ledoff”, “switch”, “lightOn”, you can define, for example, “ledon”, “ledoff” with range 0 - 2 and “switch” with “lightOn” in range 1-2.
- Finally, **download the ZIP** with all the generated files to use them wherever you need.
