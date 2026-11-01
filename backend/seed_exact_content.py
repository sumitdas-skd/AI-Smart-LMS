import os
from sqlalchemy.orm import Session
from fpdf import FPDF
from app.database import SessionLocal
from app.models.academic import Subject, SyllabusEntry
from app.models.content import Note, Video, QARepository, PreviousQuestion
from app.models.user import User

EXACT_PAYLOAD = [
    {
        "keywords": ["mathematics", "math"],
        "syllabus": [
            {"unit": 1, "title": "Matrices", "desc": "Types, Rank, Eigen Values, Eigen Vectors"},
            {"unit": 2, "title": "Calculus", "desc": "Limits, Derivatives, Integration, Partial Derivatives"},
            {"unit": 3, "title": "Differential Equations", "desc": "First Order, Second Order, Laplace Transform"},
            {"unit": 4, "title": "Vector Calculus", "desc": "Gradient, Divergence, Curl, Green's Theorem"},
            {"unit": 5, "title": "Series", "desc": "Taylor Series, Fourier Series, Z-Transform"}
        ],
        "notes": [
            {"title": "Calculus Visualized", "url": "https://www.mathsisfun.com/calculus/"},
            {"title": "MIT OCW Mathematics Materials", "url": "https://ocw.mit.edu/courses/mathematics/"},
            {"title": "Engineering Mathematics by B.S. Grewal Notes", "pdf": True},
            {"title": "Matrix Algebra Complete Notes", "pdf": True},
            {"title": "Differential Equations Solved Examples", "pdf": True}
        ],
        "videos": [
            {"title": "Matrices Full Course", "url": "https://www.youtube.com/embed/rowWM-tvZB8", "topic": "Unit 1"},
            {"title": "Calculus by Khan Academy", "url": "https://www.youtube.com/embed/EKvHQc3QEow", "topic": "Unit 2"},
            {"title": "Differential Equations", "url": "https://www.youtube.com/embed/p_di4Zn4wz4", "topic": "Unit 3"},
            {"title": "Laplace Transform", "url": "https://www.youtube.com/embed/6MXMDrs6ZmA", "topic": "Unit 4"},
            {"title": "Fourier Series", "url": "https://www.youtube.com/embed/r6sGWTCMz2k", "topic": "Unit 5"}
        ],
        "qa": [
            {"q": "What is the rank of a matrix?", "a": "The rank of a matrix is the maximum number of linearly independent rows or columns in the matrix.", "diff": "easy"},
            {"q": "What is an Eigen Value?", "a": "Eigen values are special scalars associated with a linear system of equations where Ax = λx. Here λ is the eigen value.", "diff": "medium"},
            {"q": "What is the Laplace Transform used for?", "a": "Laplace Transform converts differential equations into algebraic equations making them easier to solve.", "diff": "hard"},
            {"q": "State Green's Theorem.", "a": "Green's theorem relates a line integral around a simple closed curve to a double integral over the plane region bounded by that curve.", "diff": "medium"}
        ],
        "pyq": {
            2023: "Solve the system of equations using matrix method: 2x+y+z=3, x+3y+2z=4, x+y+3z=5",
            2022: "Find the Eigen values and Eigen vectors of matrix A = [[4,1],[2,3]]",
            2021: "Solve dy/dx + 2y = e^x using integrating factor",
            2020: "Find the Fourier series of f(x) = x in (0, 2π)",
            2019: "Apply Laplace transform to solve y'' - 3y' + 2y = 4e^2t, y(0)=1, y'(0)=3"
        }
    },
    {
        "keywords": ["physics", "mechanic"],
        "syllabus": [
            {"unit": 1, "title": "Wave Optics", "desc": "Interference, Diffraction, Polarization"},
            {"unit": 2, "title": "Quantum Mechanics", "desc": "Wave-Particle Duality, Schrodinger Equation"},
            {"unit": 3, "title": "Lasers and Fiber Optics", "desc": "Types, Working, Applications"},
            {"unit": 4, "title": "Semiconductors", "desc": "Band Theory, P-N Junction, Transistors"},
            {"unit": 5, "title": "Superconductivity and Nanotechnology", "desc": "Meissner effect, nanomaterials"}
        ],
        "notes": [
            {"title": "Engineering Physics by H.K. Dass Notes", "pdf": True},
            {"title": "Laser and Fiber Optics Complete Notes", "pdf": True},
            {"title": "Quantum Mechanics Short Notes", "pdf": True},
            {"title": "MIT OCW Physics", "url": "https://ocw.mit.edu/courses/physics/"}
        ],
        "videos": [
            {"title": "Wave Optics", "url": "https://www.youtube.com/embed/Iuv6hY6zsd0", "topic": "Unit 1"},
            {"title": "Quantum Mechanics Basics", "url": "https://www.youtube.com/embed/p7bzE1E5PMY", "topic": "Unit 2"},
            {"title": "Lasers Explained", "url": "https://www.youtube.com/embed/WgzynezPiyc", "topic": "Unit 3"},
            {"title": "Semiconductor Physics", "url": "https://www.youtube.com/embed/JBtEckh3L9Q", "topic": "Unit 4"},
            {"title": "Fiber Optics Working", "url": "https://www.youtube.com/embed/0MwMkBET_5I", "topic": "Unit 5"}
        ],
        "qa": [
            {"q": "What is the principle of a LASER?", "a": "LASER works on the principle of stimulated emission of radiation.", "diff": "medium"},
            {"q": "What is Heisenberg Uncertainty Principle?", "a": "We cannot simultaneously measure exact position and momentum. Δx × Δp ≥ h/4π", "diff": "hard"},
            {"q": "What is total internal reflection?", "a": "When light travels to rarer medium at an angle greater than critical angle, it gets completely reflected.", "diff": "medium"}
        ],
        "pyq": {
            2023: "Derive Schrodinger's time-independent wave equation",
            2022: "Explain construction and working of Ruby Laser",
            2021: "What is numerical aperture of optical fiber? Derive it",
            2020: "Explain Meissner effect in superconductors",
            2019: "Describe quantum confinement in nanomaterials"
        }
    },
    {
        "keywords": ["c programming", "python"],
        "syllabus": [
            {"unit": 1, "title": "Introduction", "desc": "Basics, Data Types, Variables, Operators"},
            {"unit": 2, "title": "Control Structures", "desc": "if/else, loops, switch"},
            {"unit": 3, "title": "Functions", "desc": "Declaration, Call, Recursion"},
            {"unit": 4, "title": "Arrays, Strings, Pointers", "desc": "1D/2D Arrays, Pointer arithmetic"},
            {"unit": 5, "title": "Structures, File Handling", "desc": "Structs, Unions, fread, fwrite"}
        ],
        "notes": [
            {"title": "C Programming by Dennis Ritchie Notes", "pdf": True},
            {"title": "Python Basics Complete Guide", "pdf": True},
            {"title": "Pointers in C — Detailed Notes", "pdf": True},
            {"title": "C Tutorial W3Schools", "url": "https://www.w3schools.com/c/"},
            {"title": "Python Tutorial W3Schools", "url": "https://www.w3schools.com/python/"}
        ],
        "videos": [
            {"title": "C Programming Full Course", "url": "https://www.youtube.com/embed/KJgsSFOSQv0", "topic": "Unit 1"},
            {"title": "Python for Beginners", "url": "https://www.youtube.com/embed/rfscVS0vtbw", "topic": "Unit 2"},
            {"title": "Pointers in C", "url": "https://www.youtube.com/embed/zuegQmMdy8M", "topic": "Unit 4"},
            {"title": "Recursion Explained", "url": "https://www.youtube.com/embed/IJDJ0kBx2LM", "topic": "Unit 3"},
            {"title": "File Handling in C", "url": "https://www.youtube.com/embed/LnbDEKWQKrA", "topic": "Unit 5"}
        ],
        "qa": [
            {"q": "Difference between call by value and call by reference?", "a": "Call by value passes copy. Call by reference passes address.", "diff": "easy"},
            {"q": "What is recursion?", "a": "A function calling itself repeatedly until base condition.", "diff": "medium"},
            {"q": "What is a pointer in C?", "a": "A variable storing memory address of another variable.", "diff": "hard"}
        ],
        "pyq": {
            2023: "Write a C program to find factorial using recursion",
            2022: "Explain pointers with example. Swap numbers using pointers",
            2021: "Write Python program to sort list using bubble sort",
            2020: "Explain file handling functions in C",
            2019: "Implement stack using arrays"
        }
    },
    {
        "keywords": ["electrical", "circuit"],
        "syllabus": [
            {"unit": 1, "title": "DC Circuits", "desc": "Ohm's Law, KVL, KCL, Thevenin's Theorem"},
            {"unit": 2, "title": "AC Circuits", "desc": "Phasors, Impedance, Power Factor"},
            {"unit": 3, "title": "Transformers", "desc": "Working, Types, Efficiency"},
            {"unit": 4, "title": "DC Machines", "desc": "Motors, Generators"},
            {"unit": 5, "title": "AC Machines", "desc": "Induction Motor, Synchronous Machine"}
        ],
        "notes": [{"title": "Basic Electrical Engineering Complete Notes", "pdf": True}],
        "videos": [
            {"title": "KVL and KCL", "url": "https://www.youtube.com/embed/3NcIK0s3IwU", "topic": "Unit 1"},
            {"title": "Thevenin's Theorem", "url": "https://www.youtube.com/embed/HBN_UdRmMPE", "topic": "Unit 1"},
            {"title": "AC Circuits", "url": "https://www.youtube.com/embed/0GSjRe1ZAPI", "topic": "Unit 2"},
            {"title": "Transformer Working", "url": "https://www.youtube.com/embed/GMcK_8-8bX4", "topic": "Unit 3"},
            {"title": "Induction Motor", "url": "https://www.youtube.com/embed/AQqyGNOP_3o", "topic": "Unit 5"}
        ],
        "qa": [{ "q": "State KVL.", "a": "Algebraic sum of voltages around closed loop is zero.", "diff": "easy" },
               { "q": "What is power factor?", "a": "Ratio of real power to apparent power.", "diff": "medium" }],
        "pyq": {
            2023: "Find current through branches using KVL and KCL",
            2022: "Derive EMF equation of transformer",
            2021: "Explain working of DC generator",
            2020: "What is back EMF? Significance?",
            2019: "Derive torque equation of three phase induction motor"
        }
    },
    {
        "keywords": ["drawing", "graphics"],
        "syllabus": [
            {"unit": 1, "title": "Instruments", "desc": "Drawing Instruments and Conventions"},
            {"unit": 2, "title": "Geometric Constructions", "desc": "Lines, Angles, Polygons"},
            {"unit": 3, "title": "Orthographic", "desc": "Orthographic Projections"},
            {"unit": 4, "title": "Isometric", "desc": "Isometric Views and Projections"},
            {"unit": 5, "title": "Section of Solids", "desc": "Cutting Planes and True Shape"}
        ],
        "notes": [{"title": "Engineering Graphics Visual Guide", "pdf": True}],
        "videos": [
            {"title": "Engineering Drawing Basics", "url": "https://www.youtube.com/embed/gWMKDZHoGLQ", "topic": "Unit 1"},
            {"title": "Orthographic Projection", "url": "https://www.youtube.com/embed/OZQaGDqzBFc", "topic": "Unit 3"},
            {"title": "Isometric Drawing", "url": "https://www.youtube.com/embed/mNL1W8KWUBM", "topic": "Unit 4"}
        ],
        "qa": [{"q":"What is Orthographic projection?", "a":"2D representation of 3D objects using parallel lines.", "diff":"easy"}],
        "pyq": { 2023: "Draw the orthographic projection of the given machine block." }
    },
    {
        "keywords": ["data structure", "algorithm"],
        "syllabus": [
            {"unit": 1, "title": "Arrays, Linked Lists", "desc": "Singly, Doubly, Circular"},
            {"unit": 2, "title": "Stacks and Queues", "desc": "Implementation, Applications"},
            {"unit": 3, "title": "Trees", "desc": "Binary Tree, BST, AVL Tree, Heap"},
            {"unit": 4, "title": "Graphs", "desc": "BFS, DFS, Shortest Path Algorithms"},
            {"unit": 5, "title": "Sorting & Searching", "desc": "Bubble, Quick, Merge, Binary Search"}
        ],
        "notes": [
            {"title": "Data Structures by Narasimha Karumanchi Notes", "pdf": True},
            {"title": "Algorithm Analysis — Time & Space Complexity", "pdf": True},
            {"title": "Graph Algorithms Complete Notes", "pdf": True},
            {"title": "VisuAlgo Tool", "url": "https://visualgo.net/"}
        ],
        "videos": [
            {"title": "Linked Lists Full", "url": "https://www.youtube.com/embed/njTh_OwMljA", "topic": "Unit 1"},
            {"title": "Stack and Queue", "url": "https://www.youtube.com/embed/wjI1WNcIntg", "topic": "Unit 2"},
            {"title": "Binary Search Tree", "url": "https://www.youtube.com/embed/pYT9F8_LFTM", "topic": "Unit 3"},
            {"title": "Graph BFS and DFS", "url": "https://www.youtube.com/embed/pcKY4hjDrxk", "topic": "Unit 4"},
            {"title": "Sorting Algorithms", "url": "https://www.youtube.com/embed/kPRA0W1kECg", "topic": "Unit 5"}
        ],
        "qa": [
            {"q": "Difference between Stack and Queue?", "a": "Stack is LIFO, Queue is FIFO.", "diff": "easy"},
            {"q": "Time complexity of Quick Sort?", "a": "Best/Avg: O(n log n), Worst: O(n^2)", "diff": "medium"},
            {"q": "What is a Binary Search Tree (BST)?", "a": "Tree where left child < parent < right child.", "diff": "hard"}
        ],
        "pyq": {
            2023: "Write algorithm for Merge Sort and find its complexity",
            2022: "Construct AVL tree by inserting 10, 20, 30, 40, 50",
            2021: "Implement BFS and DFS for a given graph",
            2020: "Write a program to implement circular linked list",
            2019: "Explain Dijkstra's shortest path algorithm with example"
        }
    },
    {
        "keywords": ["object oriented", "java", "c++", "oop"],
        "syllabus": [
            {"unit": 1, "title": "OOP Concepts", "desc": "Classes, Objects, Encapsulation"},
            {"unit": 2, "title": "Inheritance", "desc": "Single, Multiple, Multilevel"},
            {"unit": 3, "title": "Polymorphism", "desc": "Method Overloading, Overriding"},
            {"unit": 4, "title": "Abstraction", "desc": "Interfaces, Abstract Classes"},
            {"unit": 5, "title": "Exception Handling", "desc": "File I/O, Multithreading"}
        ],
        "notes": [{"title": "Core Java Complete Notes", "pdf": True}, {"title": "C++ OOP Concepts", "pdf": True}],
        "videos": [
            {"title": "Java OOP Full Course", "url": "https://www.youtube.com/embed/GoXwIVyNvX0", "topic": "Unit 1"},
            {"title": "Inheritance in Java", "url": "https://www.youtube.com/embed/Zs342ePFvRI", "topic": "Unit 2"},
            {"title": "Polymorphism Explained", "url": "https://www.youtube.com/embed/0xw06loTm1k", "topic": "Unit 3"},
            {"title": "Exception Handling", "url": "https://www.youtube.com/embed/1XAfapkBQjk", "topic": "Unit 5"},
            {"title": "Multithreading in Java", "url": "https://www.youtube.com/embed/TCd8QIS-2KI", "topic": "Unit 5"}
        ],
        "qa": [
            {"q": "What are 4 pillars of OOP?", "a": "Encapsulation, Inheritance, Polymorphism, Abstraction.", "diff": "easy"},
            {"q": "Overloading vs Overriding?", "a": "Overloading is compile-time (same class). Overriding is runtime (child class).", "diff": "medium"}
        ],
        "pyq": {
            2023: "Explain multiple inheritance with example in Java",
            2022: "Write a program to demonstrate polymorphism",
            2021: "What is interface? How is it different from abstract class?",
            2020: "Write exception handling using try-catch-finally",
            2019: "Implement producer-consumer problem using multithreading"
        }
    },
    {
        "keywords": ["digital logic", "digital electronics", "dld"],
        "syllabus": [
            {"unit": 1, "title": "Number Systems", "desc": "Binary, Octal, Hexadecimal"},
            {"unit": 2, "title": "Boolean Algebra", "desc": "Logic Gates, K-Map"},
            {"unit": 3, "title": "Combinational Circuits", "desc": "Adder, Subtractor, MUX, DEMUX"},
            {"unit": 4, "title": "Sequential Circuits", "desc": "Flip Flops, Counters, Registers"},
            {"unit": 5, "title": "Memory Devices", "desc": "RAM, ROM, PLA, PAL"}
        ],
        "notes": [{"title": "Digital Electronics Circuit Notes", "pdf": True}],
        "videos": [
            {"title": "Number Systems", "url": "https://www.youtube.com/embed/FFDMzbrEXaE", "topic": "Unit 1"},
            {"title": "Logic Gates and Boolean Algebra", "url": "https://www.youtube.com/embed/INKATZDqJtM", "topic": "Unit 2"},
            {"title": "K-Map Simplification", "url": "https://www.youtube.com/embed/RO5alU6PpSU", "topic": "Unit 2"},
            {"title": "Flip Flops Full", "url": "https://www.youtube.com/embed/yMo35sTFbCo", "topic": "Unit 4"},
            {"title": "Counters and Registers", "url": "https://www.youtube.com/embed/iaIL1QoTQv0", "topic": "Unit 4"}
        ],
        "qa": [{"q": "Convert 255 to binary.", "a": "(11111111)_2", "diff": "easy"}, {"q": "What is a Flip Flop?", "a": "Sequential circuit storing 1 bit of data.", "diff": "medium"}],
        "pyq": {
            2023: "Minimize using K-Map: F(A,B,C,D) = Σm(0,1,2,5,8,9,10)",
            2022: "Design a 4-bit binary ripple counter using JK flip flops",
            2021: "Implement full adder using NAND gates only",
            2020: "Explain working of 4:1 multiplexer",
            2019: "Compare SRAM and DRAM"
        }
    },
    {
        "keywords": ["discrete mathematics"],
        "syllabus": [
            {"unit": 1, "title": "Set Theory", "desc": "Relations, Functions"},
            {"unit": 2, "title": "Mathematical Logic", "desc": "Propositions, Predicates"},
            {"unit": 3, "title": "Graph Theory", "desc": "Trees, Spanning Trees"},
            {"unit": 4, "title": "Combinatorics", "desc": "Permutations, Combinations"},
            {"unit": 5, "title": "Algebraic Structures", "desc": "Groups, Rings, Fields"}
        ],
        "notes": [{"title": "Discrete Structures Complete Material", "pdf": True}],
        "videos": [
            {"title": "Set Theory Full", "url": "https://www.youtube.com/embed/tyDKR4FG3Yw", "topic": "Unit 1"},
            {"title": "Graph Theory Basics", "url": "https://www.youtube.com/embed/LFKZLXVO-Dg", "topic": "Unit 3"},
            {"title": "Permutations and Combinations", "url": "https://www.youtube.com/embed/XqQTXW7XfYA", "topic": "Unit 4"},
            {"title": "Mathematical Logic", "url": "https://www.youtube.com/embed/2It44jfFnlY", "topic": "Unit 2"}
        ],
        "qa": [{"q":"What is a Spanning Tree?","a":"A subgraph that is a tree containing all vertices.","diff":"hard"}],
        "pyq": {2023: "Prove De Morgan's Law using Truth Table."}
    },
    {
        "keywords": ["operating system"],
        "syllabus": [
            {"unit": 1, "title": "OS Introduction", "desc": "Types, Structure, System Calls"},
            {"unit": 2, "title": "Process Management", "desc": "Scheduling Algorithms"},
            {"unit": 3, "title": "Memory Management", "desc": "Paging, Segmentation, Virtual Memory"},
            {"unit": 4, "title": "File Systems", "desc": "Structure, Allocation Methods"},
            {"unit": 5, "title": "Deadlocks", "desc": "Detection, Prevention, Avoidance (Banker's Algorithm)"}
        ],
        "notes": [{"title": "Galvin OS Complete Notes", "pdf": True}],
        "videos": [
            {"title": "OS Full Course", "url": "https://www.youtube.com/embed/vBURTt97EkA", "topic": "Unit 1"},
            {"title": "CPU Scheduling", "url": "https://www.youtube.com/embed/EWkQl0n0w5M", "topic": "Unit 2"},
            {"title": "Paging and Segmentation", "url": "https://www.youtube.com/embed/pJ6qrCB8pDw", "topic": "Unit 3"},
            {"title": "Deadlock and Banker's Algorithm", "url": "https://www.youtube.com/embed/7gMLNiEz3nw", "topic": "Unit 5"},
            {"title": "File System Concepts", "url": "https://www.youtube.com/embed/mzUyMy7Ihk0", "topic": "Unit 4"}
        ],
        "qa": [
            {"q": "Process vs Thread?", "a": "Process is independent program. Thread shares memory.", "diff": "medium"},
            {"q": "Explain Round Robin.", "a": "Each process gets a fixed time quantum.", "diff": "medium"},
            {"q": "What is Thrashing?", "a": "When process spends more time swapping pages than executing.", "diff": "hard"}
        ],
        "pyq": {
            2023: "Apply Banker's Algorithm for deadlock avoidance",
            2022: "Compare FCFS, SJF, and Round Robin",
            2021: "Explain page replacement algorithms (LRU, FIFO)",
            2020: "What is semaphore? Solve producer-consumer",
            2019: "Explain inode structure"
        }
    },
    {
        "keywords": ["database", "dbms"],
        "syllabus": [
            {"unit": 1, "title": "Introduction", "desc": "DBMS vs RDBMS, Architecture"},
            {"unit": 2, "title": "ER Model", "desc": "Entities, Relationships, ER Diagram"},
            {"unit": 3, "title": "Relational Algebra", "desc": "SQL — DDL, DML, DCL"},
            {"unit": 4, "title": "Normalization", "desc": "1NF, 2NF, 3NF, BCNF"},
            {"unit": 5, "title": "Transactions", "desc": "ACID Properties, Concurrency Control"}
        ],
        "notes": [{"title": "Korth Database Management Complete PDF", "pdf": True}],
        "videos": [
            {"title": "DBMS Full Course", "url": "https://www.youtube.com/embed/kBdlM6hNDAE", "topic": "Unit 1"},
            {"title": "SQL Complete Tutorial", "url": "https://www.youtube.com/embed/HXV3zeQKqGY", "topic": "Unit 3"},
            {"title": "ER Diagram", "url": "https://www.youtube.com/embed/QpdhBUYk7Kk", "topic": "Unit 2"},
            {"title": "Normalization 1NF to BCNF", "url": "https://www.youtube.com/embed/GFQaEYEc8_8", "topic": "Unit 4"},
            {"title": "ACID Properties", "url": "https://www.youtube.com/embed/pomxJOFVcQs", "topic": "Unit 5"}
        ],
        "qa": [
            {"q": "ACID properties?", "a": "Atomicity, Consistency, Isolation, Durability.", "diff": "easy"},
            {"q": "What is normalization?", "a": "Process of reducing redundancy and improving data integrity.", "diff": "medium"}
        ],
        "pyq": {
            2023: "Normalize the given relation to BCNF",
            2022: "Write SQL queries for JOIN, GROUP BY",
            2021: "Draw ER diagram for hospital management",
            2020: "Explain two-phase locking protocol",
            2019: "Compare B-tree and B+ tree"
        }
    },
    {
        "keywords": ["computer network", "network"],
        "syllabus": [
            {"unit": 1, "title": "OSI and TCP/IP Model", "desc": "7 Layers Explained"},
            {"unit": 2, "title": "Data Link Layer", "desc": "Error Detection, Flow Control"},
            {"unit": 3, "title": "Network Layer", "desc": "IP Addressing, Subnetting, Routing"},
            {"unit": 4, "title": "Transport Layer", "desc": "TCP, UDP, Congestion Control"},
            {"unit": 5, "title": "Application Layer", "desc": "HTTP, FTP, DNS, SMTP"}
        ],
        "notes": [{"title": "Computer Networks Forouzan Full PDF", "pdf": True}],
        "videos": [
            {"title": "OSI Model Full", "url": "https://www.youtube.com/embed/vv4y_uOneC0", "topic": "Unit 1"},
            {"title": "IP Addressing & Subnetting", "url": "https://www.youtube.com/embed/s_gy5T6aG4A", "topic": "Unit 3"},
            {"title": "TCP vs UDP", "url": "https://www.youtube.com/embed/uwoD5YsGACg", "topic": "Unit 4"},
            {"title": "DNS and HTTP", "url": "https://www.youtube.com/embed/72snZctFFtA", "topic": "Unit 5"},
            {"title": "Routing Algorithms", "url": "https://www.youtube.com/embed/5k7D2qJkFNk", "topic": "Unit 3"}
        ],
        "qa": [
            {"q": "TCP vs UDP?", "a": "TCP is reliable connection-oriented. UDP is fast connectionless.", "diff": "medium"},
            {"q": "What is subnetting?", "a": "Divides large network into smaller sub-networks.", "diff": "hard"}
        ],
        "pyq": {
            2023: "Explain sliding window protocol",
            2022: "Find subnet mask and host range for 192.168.10.0/26",
            2021: "Compare distance vector and link state routing",
            2020: "Explain three-way handshake in TCP",
            2019: "Describe working of DNS"
        }
    },
    {
        "keywords": ["software engineering"],
        "syllabus": [
            {"unit": 1, "title": "SDLC Models", "desc": "Waterfall, Spiral, Agile, Scrum"},
            {"unit": 2, "title": "Requirement Engineering", "desc": "SRS Document"},
            {"unit": 3, "title": "Software Design", "desc": "UML Diagrams, Design Patterns"},
            {"unit": 4, "title": "Software Testing", "desc": "Unit, Integration, System Testing"},
            {"unit": 5, "title": "Software Metrics", "desc": "Quality Assurance, COCOMO Model"}
        ],
        "notes": [{"title": "Pressman Software Engineering Notes", "pdf": True}],
        "videos": [
            {"title": "SDLC Models", "url": "https://www.youtube.com/embed/M-k_sUhZzEQ", "topic": "Unit 1"},
            {"title": "UML Diagrams", "url": "https://www.youtube.com/embed/OkC7HKtiZC0", "topic": "Unit 3"},
            {"title": "Agile and Scrum", "url": "https://www.youtube.com/embed/xuosPTchj-g", "topic": "Unit 1"},
            {"title": "Software Testing", "url": "https://www.youtube.com/embed/TDynSmrzpXw", "topic": "Unit 4"}
        ],
        "qa": [{"q": "What is Agile?", "a": "Iterative and incremental software development framework.", "diff": "easy"}],
        "pyq": {2023: "Calculate cost using COCOMO model for 200 KLOC system."}
    },
    {
        "keywords": ["machine learning"],
        "syllabus": [
            {"unit": 1, "title": "Introduction to ML", "desc": "Supervised, Unsupervised, Reinforcement"},
            {"unit": 2, "title": "Regression", "desc": "Linear, Logistic, Polynomial"},
            {"unit": 3, "title": "Classification", "desc": "Decision Tree, SVM, KNN, Naive Bayes"},
            {"unit": 4, "title": "Clustering", "desc": "K-Means, Hierarchical Clustering"},
            {"unit": 5, "title": "Neural Networks", "desc": "Perceptron, Backpropagation, CNN, RNN"}
        ],
        "notes": [{"title": "Andrew Ng Machine Learning Notes", "pdf": True}],
        "videos": [
            {"title": "ML Full Course", "url": "https://www.youtube.com/embed/NWONeJKn6kc", "topic": "Unit 1"},
            {"title": "Linear Regression", "url": "https://www.youtube.com/embed/nk2CQITm_eo", "topic": "Unit 2"},
            {"title": "Decision Trees", "url": "https://www.youtube.com/embed/ZVR2Way4nwQ", "topic": "Unit 3"},
            {"title": "K-Means Clustering", "url": "https://www.youtube.com/embed/4b5d3muPQmA", "topic": "Unit 4"},
            {"title": "Neural Networks", "url": "https://www.youtube.com/embed/aircAruvnKk", "topic": "Unit 5"}
        ],
        "qa": [
            {"q": "Supervised vs Unsupervised?", "a": "Supervised has labeled data. Unsupervised finds patterns without labels.", "diff": "medium"},
            {"q": "What is overfitting?", "a": "Model learns noise in training data, performs poorly on test data. Fix: Regularization, Dropout.", "diff": "hard"}
        ],
        "pyq": {
            2023: "Derive gradient descent algorithm",
            2022: "Explain SVM kernel trick",
            2021: "Compare K-Means and hierarchical clustering",
            2020: "Derive backpropagation",
            2019: "Explain CNN architecture"
        }
    },
    {
        "keywords": ["artificial intelligence", "ai"],
        "syllabus": [
            {"unit": 1, "title": "AI Introduction", "desc": "History, Applications, Turing Test"},
            {"unit": 2, "title": "Search Algorithms", "desc": "BFS, DFS, A*, Hill Climbing"},
            {"unit": 3, "title": "Knowledge Representation", "desc": "Propositional, Predicate Logic"},
            {"unit": 4, "title": "Expert Systems", "desc": "Architecture, Inference Engine"},
            {"unit": 5, "title": "NLP", "desc": "Tokenization, NER, Sentiment Analysis"}
        ],
        "notes": [{"title": "Artificial Intelligence Modern Approach PDF", "pdf": True}],
        "videos": [
            {"title": "AI Full Course", "url": "https://www.youtube.com/embed/JMUxmLyrhSk", "topic": "Unit 1"},
            {"title": "A* Algorithm", "url": "https://www.youtube.com/embed/-L-WgKMFuhE", "topic": "Unit 2"},
            {"title": "Expert Systems", "url": "https://www.youtube.com/embed/i2GzXGhG-Eo", "topic": "Unit 4"},
            {"title": "NLP Basics", "url": "https://www.youtube.com/embed/CMrHM8a3hqw", "topic": "Unit 5"}
        ],
        "qa": [
            {"q": "What is A* algorithm?", "a": "Best-first search using f(n) = g(n) + h(n).", "diff": "hard"},
            {"q": "What is an Expert System?", "a": "AI program mocking human expert decisions (Knowledge Base + Inference Engine).", "diff": "medium"}
        ],
        "pyq": {
            2023: "Trace A* algorithm",
            2022: "Explain resolution principle",
            2021: "Design expert system",
            2020: "Explain Bag of Words model",
            2019: "Compare hill climbing and simulated annealing"
        }
    },
    {
        "keywords": ["cloud computing"],
        "syllabus": [
            {"unit": 1, "title": "Cloud Basics", "desc": "IaaS, PaaS, SaaS, Deployment Models"},
            {"unit": 2, "title": "Virtualization", "desc": "Types, Hypervisors, Containers"},
            {"unit": 3, "title": "Cloud Storage", "desc": "Object, Block, File Storage"},
            {"unit": 4, "title": "Cloud Security", "desc": "IAM, Encryption, Compliance"},
            {"unit": 5, "title": "Cloud Platforms", "desc": "AWS, Google Cloud, Azure Overview"}
        ],
        "notes": [{"title": "Cloud Computing Infrastructure Notes", "pdf": True}],
        "videos": [
            {"title": "Cloud Computing Full", "url": "https://www.youtube.com/embed/M988_fsOSWo", "topic": "Unit 1"},
            {"title": "AWS Basics", "url": "https://www.youtube.com/embed/ulprqHHWlng", "topic": "Unit 5"},
            {"title": "Virtualization Explained", "url": "https://www.youtube.com/embed/FZR0rG3HKIk", "topic": "Unit 2"},
            {"title": "Docker and Containers", "url": "https://www.youtube.com/embed/3c-iBn73dDE", "topic": "Unit 2"}
        ],
        "qa": [{"q": "IaaS vs PaaS vs SaaS?", "a": "IaaS manages hardware, PaaS manages OS/Runtime, SaaS manages application.", "diff": "medium"}],
        "pyq": {2023: "Explain type 1 and type 2 hypervisors."}
    },
    {
        "keywords": ["security", "cyber", "information security"],
        "syllabus": [
            {"unit": 1, "title": "Security Goals", "desc": "CIA Triad, Threats, Attacks"},
            {"unit": 2, "title": "Cryptography", "desc": "Symmetric, Asymmetric, AES, RSA"},
            {"unit": 3, "title": "Network Security", "desc": "Firewall, IDS, VPN"},
            {"unit": 4, "title": "Web Security", "desc": "XSS, SQL Injection, CSRF"},
            {"unit": 5, "title": "Digital Signatures", "desc": "Certificates, PKI"}
        ],
        "notes": [{"title": "Network Security Complete PDF By Stallings", "pdf": True}],
        "videos": [
            {"title": "Cryptography Full", "url": "https://www.youtube.com/embed/AQDCe585Lnc", "topic": "Unit 2"},
            {"title": "RSA Algorithm", "url": "https://www.youtube.com/embed/wXB-V_Keiu8", "topic": "Unit 2"},
            {"title": "Network Security", "url": "https://www.youtube.com/embed/sdpxddDzXfE", "topic": "Unit 3"},
            {"title": "Ethical Hacking Basics", "url": "https://www.youtube.com/embed/3Kq1MIfTWCE", "topic": "Unit 1"}
        ],
        "qa": [{"q": "CIA Triad?", "a": "Confidentiality, Integrity, Availability.", "diff": "easy"}],
        "pyq": {
            2023: "Explain RSA encryption and decryption",
            2022: "What is digital signature?",
            2021: "Explain different types of SQL injection",
            2020: "What is PKI? Role of Auth?",
            2019: "Compare symmetric and asymmetric encryption"
        }
    }
]

def sanitize(text):
    if not isinstance(text, str):
        return text
    replacements = {
        'π': 'pi',
        'λ': 'lambda',
        'Δ': 'Delta ',
        'Σ': 'Sigma ',
        '²': '^2',
        '₁': '_1',
        '₀': '_0',
        '—': '-',
        '’': "'",
        '”': '"',
        '“': '"',
        '×': 'x',
        '÷': '/',
        '•': '-'
    }
    for k, v in replacements.items():
        text = text.replace(k, v)
    return ''.join([c if ord(c) < 128 else '' for c in text])

def generate_pdf(filename, text, title):
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("helvetica", "B", 16)
    pdf.cell(w=0, h=10, text=sanitize(title), new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.cell(w=0, h=10, text="", new_x="LMARGIN", new_y="NEXT") # Spacing
    pdf.set_font("helvetica", "", 12)
    for line in text.split("\n"):
        if line.strip():
            pdf.multi_cell(w=0, h=8, text=sanitize(line.strip()), new_x="LMARGIN", new_y="NEXT")
        else:
            pdf.cell(w=0, h=5, text="", new_x="LMARGIN", new_y="NEXT")

    os.makedirs("uploads/generated", exist_ok=True)
    filepath = f"uploads/generated/{filename}.pdf"
    pdf.output(filepath)
    return f"/{filepath}"

def run_seeder():
    db = SessionLocal()
    admin = db.query(User).filter(User.role == "admin").first()
    admin_id = admin.id if admin else 1

    subjects = db.query(Subject).all()
    print("Beginning Complete 4-Year B.Tech Seeding Payload...")

    for subject in subjects:
        # Check if subject natively matches a specified payload target
        sub_name = subject.name.lower()
        matched_payload = None
        for payload in EXACT_PAYLOAD:
            for keyword in payload["keywords"]:
                if keyword in sub_name:
                    matched_payload = payload
                    break
            if matched_payload:
                break
        
        if matched_payload:
            print(f"-> Overwriting {subject.name} with EXPLICIT Premium Payload.")
            # Clear old generated data strictly for matching subjects
            db.query(SyllabusEntry).filter(SyllabusEntry.subject_id == subject.id).delete()
            db.query(Note).filter(Note.subject_id == subject.id).delete()
            db.query(Video).filter(Video.subject_id == subject.id).delete()
            db.query(QARepository).filter(QARepository.subject_id == subject.id).delete()
            db.query(PreviousQuestion).filter(PreviousQuestion.subject_id == subject.id).delete()
            db.commit()

            # Seed Syllabus Units from explicit data
            for item in matched_payload["syllabus"]:
                unit = SyllabusEntry(
                    title=f"Unit {item['unit']}: {item['title']}",
                    description=item['desc'],
                    unit_number=item['unit'],
                    subject_id=subject.id,
                    created_by=admin_id
                )
                db.add(unit)

            # Seed Explicit Notes
            for item in matched_payload["notes"]:
                if "pdf" in item:
                    # Physically Generate Custom Premium PDF
                    pdf_text = f"This is the official generated premium documentation for {item['title']} covering all topics.\n\nSyllabus Units:\n" + "\n".join([f"- {s['title']}: {s['desc']}" for s in matched_payload['syllabus']])
                    f_path = generate_pdf(f"spec_note_{hash(item['title'])}", pdf_text, item['title'])
                    note = Note(title=item['title'], description=f"Detailed manual upload for {subject.name}", file_path=f_path, subject_id=subject.id, uploaded_by=admin_id)
                else:
                    note = Note(title=item['title'], description=f"External Reference for {subject.name}", external_link=item['url'], subject_id=subject.id, uploaded_by=admin_id)
                db.add(note)

            # Seed Explicit Videos
            for item in matched_payload["videos"]:
                video = Video(title=item['title'], description=f"Complete breakdown of {item['topic']}", youtube_url=item['url'], subject_id=subject.id, topic=item['topic'], source="manual", uploaded_by=admin_id)
                db.add(video)

            # Seed Explicit Q&A
            for item in matched_payload["qa"]:
                qa = QARepository(subject_id=subject.id, question=item['q'], answer=item['a'], difficulty=item['diff'], source="manual", created_by=admin_id)
                db.add(qa)
            
            # Seed Explicit PYQs (Physical PDFs)
            for year, question in matched_payload["pyq"].items():
                pyq_text = f"BPUT End-Semester Examination ({year})\nSubject: {subject.name}\nDuration: 3 Hours\nMarks: 100\n\nQuestion 1:\n{question}"
                title = f"{subject.name} - EndSem {year}"
                f_path = generate_pdf(f"spec_pyq_{hash(title)}", pyq_text, title)
                pyq = PreviousQuestion(title=title, exam_type="endsem", year=year, file_path=f_path, subject_id=subject.id)
                db.add(pyq)
            
            db.commit()

    print("Success: 4-Year B.Tech Exact Curriculum Seeded Perfectly.")

if __name__ == "__main__":
    run_seeder()
