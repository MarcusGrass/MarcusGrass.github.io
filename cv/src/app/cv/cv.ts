export module Cv {

  export interface Education {
    institution: string;
    mainSubject: string;
    specialization: string;
    level: string[];
    startDate: string;
    endDate: string;
  }

  export interface Role {
    title: string;
    description: string;
    startDate: string;
    endDate?: string;
    scope: string;
  }

  export interface Employment {
    company: string;
    roles: Role[];
  }

  export interface Project {
    name: string;
    role: string;
    description: string;
    languages: string[]
    scope: string;
    time: number;
    company?: string;
    startDate: string;
    endDate?: string;
    links?: string[];
    github?: any;
  }

  export interface Cv {
    title: string;
    occupation: string;
    about: string;
    github: string;
    linkedin: string;
    education: Education[];
    employment: Employment[];
    projects: Project[];
  }

  export function createFromJson(): Cv {
    return {
      "title": "CV Marcus Grass",
      "occupation": "Software Developer",
      "github": "https://github.com/MarcusGrass",
      "linkedin": "https://se.linkedin.com/in/marcus-grass-a33731198",
      "about": "I'm a Stockholm-based software developer with a passion for Linux, Rust, and new technology in general. My preferred language is Rust, while most of my commercial experience is with Java and Python. I have worked a lot with Javascript/Typescript as well, although that is not my focus. In my free-time I enjoy searching for cool restaurants in and around Stockholm, my current favourite is Sandhäxan, if you're around St Eriksplan I highly recommend stopping by, their sandwiches are amazing! I also like working out, mostly at the gym because I'm lazy, but also climbing, kayaking, playing padel, running, and more. I wrote this CV because it was a pain maintaining and formatting a cv, so I put the data in a json file and wrote a front-end application that automatically formats it, as you can see I am not a talented designer. You can check out this project at my GitHub. Because of this everything is written in the past tense, as I don't want to have to go back and update old project descriptions when I start new ones, because as previously stated, I am very lazy.",
      "education": [
        {
          "institution": "Åva gymnasium",
          "mainSubject": "Science",
          "specialization": "Adventure and leadership",
          "level": [
            "GED"
          ],
          "startDate": "2010-09",
          "endDate": "2013-06"
        },
        {
          "institution": "KTH (Royal Institute of Technology)",
          "mainSubject": "Engineering",
          "specialization": "Design and product realization",
          "level": [
            "Masters",
            "Bachelors",
            "Civilingenjör"
          ],
          "startDate": "2014-09",
          "endDate": "2019-06"
        }
      ],
      "employment": [
        {
          "company": "Invoier",
          "roles": [
            {
              "title": "Software developer",
              "description": "General purpose full stack development.",
              "startDate": "2018-03",
              "endDate": "2019-06",
              "scope": "Part-time"
            },
            {
              "title": "Systems administrator",
              "description": "General purpose systems administration.",
              "startDate": "2018-03",
              "endDate": "2019-06",
              "scope": "Part-time"
            },
            {
              "title": "CTO",
              "description": "Technology acquisition and implementation.",
              "startDate": "2018-03",
              "endDate": "2019-06",
              "scope": "Part-time"
            }
          ]
        },
        {
          "company": "Avanza",
          "roles": [
            {
              "title": "Software developer",
              "description": "Java backend developer on the Open Banking team as well as some full-stack work.",
              "startDate": "2019-08",
              "endDate": "2021-06",
              "scope": "Full-time"
            },
            {
              "title": "SRE",
              "description": "SRE on the production team, focusing on automation.",
              "startDate": "2019-02",
              "endDate": "2019-08",
              "scope": "Part-time"
            },
            {
              "title": "Customer support",
              "description": "Customer support agent taking calls and email.",
              "startDate": "2017-06",
              "endDate": "2019-02",
              "scope": "Part-time"
            }
          ]
        },
        {
          "company": "Expleo group Stockholm",
          "roles": [
            {
              "title": "Consultant",
              "description": "An at-customer consulting role.",
              "startDate": "2021-06",
              "scope": "Full-time"
            }
          ]
        }
      ],
      "projects": [
        {
          "name": "Invoier website",
          "role": "Software developer",
          "description": "The first real software development project, the task was to develop a website for a startup founded at KTH (now under the name Invoier).",
          "languages": ["php"],
          "scope": "Commercial",
          "company": "Invoier",
          "time": 20,
          "startDate": "2018-03",
          "endDate": "2018-05"
        },
        {
          "name":"Invoier website 2.0",
          "role": "Software developer",
          "description": "A rework of the website constructed for Invoier, now written using Django making heavy use of the Django templating engine.",
          "languages": ["python"],
          "scope": "Commercial",
          "company": "Invoier",
          "time": 20,
          "startDate": "2018-05",
          "endDate": "2018-08"
        },
        {
          "name":"Reddit bots",
          "role": "Software developer",
          "description": "Creation of various reddit bots to gather statistics on discussion frequency leading up to the 2018 Swedish general election",
          "languages": ["python"],
          "scope": "Private",
          "time": 10,
          "startDate": "2018-06",
          "endDate": "2018-09"
        },
        {
          "name":"Invoier website 3.0",
          "role": "Software developer",
          "description": "A second rework of the website constructed for Invoier, now containing a backend/frontent separation using more modern web techniques and frameworks.",
          "languages": ["python", "typescript"],
          "scope": "Commercial",
          "company": "Invoier",
          "time": 20,
          "startDate": "2018-08",
          "endDate": "2018-12"
        },
        {
          "name":"Invoier machine learning algorithm",
          "role": "Software developer",
          "description": "In this project a machine learning algorithm was developed. For Invoier the purpose of the model was to predict when an invoice would be paid based on company financial data.",
          "languages": ["python"],
          "scope": "Commercial",
          "company": "Invoier",
          "time": 20,
          "startDate": "2018-09",
          "endDate": "2018-12"
        },
        {
          "name":"Invoier prediction engine",
          "role": "Software developer",
          "description": "This project involved packaging the machine learning algorithm as a http-service that answers web requests with company data and delivers predictions on when an invoice will be paid",
          "languages": ["python"],
          "scope": "Commercial",
          "time": 20,
          "company": "Invoier",
          "startDate": "2019-01",
          "endDate": "2019-03"
        },
        {
          "name":"Cookieclicker automation",
          "role": "Software developer",
          "description": "A project to automate the online game cookie clicker.",
          "languages": ["python"],
          "scope": "Private",
          "time": 10,
          "links": [
            "https://orteil.dashnet.org/cookieclicker"
          ],
          "github": [
            "https://github.com/MarcusGrass/cookie_clicker_automation"
          ],
          "startDate": "2019-01",
          "endDate": "2019-03"
        },
        {
          "name":"Masters thesis web application",
          "role": "Software developer",
          "description": "The thesis work was to build a statistics application for the customer service department and measure the productivity impact of that application. The application interfaced with internal systems and databases to gather statistics which were displayed as charts and graphs.",
          "languages": ["java", "typescript"],
          "scope": "Commercial",
          "time": 100,
          "company": "Avanza",
          "startDate": "2019-02",
          "endDate": "2019-06"
        },
        {
          "name":"Set up internal PyPi repository",
          "role": "SRE",
          "description": "This project's purpose was to set up an internal PyPi-repository so that the SREs could more easily share reusable python code. It was implemented by creating a repo where an SRE could commit a python package which would be built and published to the internal repository using runners and bash-scripts.",
          "languages": ["python", "bash"],
          "scope": "Commercial",
          "time": 25,
          "company": "Avanza",
          "startDate": "2019-05",
          "endDate": "2019-06"
        },
        {
          "name":"Rework an internal high-traffic app",
          "role": "Software developer",
          "description": "This project involved reworking an existing application. The application had been suffering instability stemming partly from instability of upstream systems and partly from synchronous communication with downstream systems. It was rewritten using idempotent retries for the upstream, as well as asynchronous event-based communication downstream.",
          "languages": ["java"],
          "scope": "Commercial",
          "time": 100,
          "company": "Avanza",
          "startDate": "2019-08",
          "endDate": "2019-11"
        },
        {
          "name":"An IntelliJ-plugin to generate boilerplate code",
          "role": "Software developer",
          "description": "In this project an IntelliJ-plugin was written to generate boilerplate for the cumbersome frameworks that were used.",
          "languages": ["java"],
          "scope": "Commercial",
          "company": "Avanza",
          "time": 10,
          "startDate": "2019-08",
          "endDate": "2019-11"
        },
        {
          "name": "Integrate with PSD2 APIs",
          "role": "Software developer",
          "description": "At Avanza an integration with another bank's PSD2 APIs was requested. In this project the open banking team integrated, through Tink, with those APIs.",
          "languages": ["java"],
          "scope": "Commercial",
          "time": 100,
          "company": "Avanza",
          "startDate": "2019-08",
          "endDate": "2019-12"
        },
        {
          "name": "Make core systems comply with new regulations",
          "role": "Software developer",
          "description": "This project included updating legacy systems to compatibility with current framework versions which had support for the regulatory requirements. As well as writing new code to make more data available.",
          "languages": ["java"],
          "scope": "Commercial",
          "company": "Avanza",
          "time": 100,
          "startDate": "2020-01",
          "endDate": "2020-06"
        },
        {
          "name": "Improve IT security",
          "role": "Software developer",
          "description": "During this time work was done to improve the IT security of systems, mainly legacy systems, the details are sensitive.",
          "languages": ["java"],
          "scope": "Commercial",
          "company": "Avanza",
          "time": 10,
          "startDate": "2020-02",
          "endDate": "2020-06"
        },
        {
          "name": "Evaluate API gateways",
          "role": "Software developer",
          "description": "The evaluation included a PoC where software was installed and evaluated by automatability, security, and ease of implementation.",
          "languages": ["java"],
          "scope": "Commercial",
          "time": 100,
          "company": "Avanza",
          "startDate": "2021-01",
          "endDate": "2021-02"
        },
        {
          "name": "Rewrite configuration validation",
          "role": "Software developer",
          "description": "An internal software validation program was implemented in java and took about 3 minutes to validate a configuration tree, this program was rewritten to Rust and the validation time dropped to about 40 seconds.",
          "languages": ["rust", "bash"],
          "scope": "Commercial",
          "company": "Avanza",
          "time": 10,
          "startDate": "2021-03",
          "endDate": "2021-04"
        },
        {
          "name": "Backoffice transformation project",
          "role": "Software developer",
          "description": "A third party backend system was to be changed from the old COBOL/as400-system to a new third party system. File based communication was exchanged for API-based communication and legacy systems required updating.",
          "languages": ["java"],
          "scope": "Commercial",
          "company": "Avanza",
          "time": 100,
          "startDate": "2021-01",
          "endDate": "2021-02"
        },
        {
          "name": "Specialty keyboard construction",
          "role": "Software developer",
          "description": "Building specialty keyboard for fun and to improve ergonomics and productivity. It includes soldering, error-checking circuit boards, and some keyboard input-programming.",
          "languages": ["c"],
          "scope": "private",
          "time": 2,
          "github": "https://github.com/MarcusGrass/qmk_firmware",
          "startDate": "2020-01"
        },
        {
          "name": "Arch linux dotfiles",
          "role": "Software developer",
          "description": "A living configuration archive which includes bootstrapping scripts making it easy to install a fresh OS with my preferred configuration and security.",
          "languages": ["python", "bash"],
          "scope": "private",
          "github": "https://github.com/MarcusGrass/arch_config",
          "time": 3,
          "startDate": "2019-10"
        },
        {
          "name": "Workout app",
          "role": "Software developer",
          "description": "A workout application that allows you to enter workout results which will then be displayed as graphs that you can follow over time",
          "languages": ["dart"],
          "scope": "private",
          "links": ["https://play.google.com/store/apps/details?id=com.github.marcusgrass.gymtrack"],
          "time": 10,
          "startDate": "2020-08",
          "endDate": "2021-05"
        },
        {
          "name": "RxRust open source contributor",
          "role": "Software developer",
          "description": "Some contribution to the Rust implementation of reactive extensions, one notable contribution was a massive fix that made the crate available on Rust's stable channel.",
          "languages": ["rust", "bash"],
          "scope": "private",
          "github": "https://github.com/rxRust/rxRust",
          "time": 5,
          "startDate": "2021-04"
        },
        {
          "name": "Kronans apotek",
          "role": "Software developer",
          "description": "In this short assignment I worked backend as a java developer at Kronans apotek, a swedish pharmacy. I did some work on the retail systems, created an internal service for tracking ownership of projects, worked on an internal monitoring tool, and wrote an application that scores and bundles products. In the end there came an assignment that I just couldn't turn down, so I decided to end this assignment early.",
          "languages": ["java"],
          "scope": "Commercial",
          "company": "Expleo",
          "time": 100,
          "startDate": "2021-06",
          "endDate": "2021-09"
        },
        {
          "name": "Embark studios",
          "role": "Software developer",
          "description": "This assignment was a dream come true, commercially working with Rust at a cool startup with extremely nice coworkers. I worked on the backend systems for one of the teams at Embark creating innovative games.",
          "languages": ["rust"],
          "scope": "Commercial",
          "time": 100,
          "company": "Expleo",
          "startDate": "2021-09"
        }
      ]
    };
  }
}
