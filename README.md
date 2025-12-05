# linewize-agent-automation
Automation framework for testing Linewize agents

# Keyword-Driven Automation Framework

## Overview

This framework provides a structured and scalable approach to web UI automation using Selenium WebDriver and TypeScript. It leverages a keyword-driven approach, allowing testers to define test cases using consistently termed phrases.

**Key Features:**

* **Keyword-Driven:** Define test cases using keywords/phrases, promoting reusability and ease of understanding.
* **TypeScript:**  Written in TypeScript for consistency with other automation frameworks at Qoria.
* **Selenium WebDriver:** Enables interaction with web browsers for automated testing.
* **Proxmox VM Integration:**  Allows execution of tests on virtual machines hosted on a Proxmox server.
* **Reporting:** Generates reports with Zephyr Scale and Google Chat integration.

## Installation

1. **Prerequisites:**
   * Node.js and npm installed.

2. **Clone the repository:**
   ```bash
   git clone https://github.com/B-Communications/linewize-agent-automation
   ```

3. **Install depedencies:**
    ```bash
    npm i
    ```

4. **Set up Environment Variables and Credentials:**

    Anything needing to be obtained from lastpass can be found in the **"LW Agent Automation Credentials"** Secure Note in the Shared-QA folder.
    
    1. The following environment variables need to be added to your zsrhc file (on Mac) or your system environment variables (on Windows):

        * A Zephyr Auth Token used for test case retrieval and test cycle submission.
        
            To generate this token, follow [this guide](https://support.smartbear.com/zephyr-scale-cloud/docs/en/rest-api/api-access-tokens-management.html).

            ```bash
            export ZEPHYR_AUTH_TOKEN=<token>
            ```

        * A Jira Auth Token used for jira ticket raising if a step definition is missing.

            1. To generate this token, follow the Create an API token section in [this guide](https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/).
            2. The token needs to be in base64 format. To do that, in terminal:

            ```bash
            echo -n "username:your_token" | base64
            ```

            3. Add the output to your environment variables as follows:

            ```bash
            export JIRA_API_TOKEN="Basic <token>"
            ```

    2. The following credentials from LASTPASS need to be added to the config/credentials.json file:

        ```json
        "adminUsername": "FROM LASTPASS",
        "adminPassword": "FROM LASTPASS",
        ```

    3. The following webhook url from LASTPASS needs to be added to the config/config.json file:
        ```json
            "Google": {
                "webhookUrl": "FROM LASTPASS"
            }
        ```


## Selenium Setup
The below steps have already been completed on the Proxmox VMs, but are relevant should you wish to execute tests on other machines.
If using Proxmox, there may be times you will need to execute the commands for starting a hub, and connecting nodes, should the VMs turn off or reboot. To determine the required IP address for the hub, on the hub VM `310 (selenium-hub-w10)`, use the following command in command prompt:
```bash
ipconfig
```

Which will return a result for IPv4 address, which is what you will need:
```bash
Ethernet adapter Ethernet Instance 0:
    Connection-specific DNS Suffix:
    IPV4 Address                  : 192.168.x.x
    ...
```

**Java** 

Install the appropriate version of Java for the test machine's operating system, required for each machine that will be running Selenium (node(s) and hub): https://www.oracle.com/au/java/technologies/downloads/

**Selenium Hub**

On Proxmox, a Linux (Lubuntu) VM has been set up to act as the Selenium hub and the it admin Selenium node. 

A shellscript runs on login to first start the hub, and then start the it admin selenium node. The script can be found in this repo within the **/scripts** folder.

To set up a scheduled task on the Linux VM:

1. Add the start-selenium-linux.sh script to the ~/selenium directory
2. Make the script executable
```bash
chmod +x ~/selenium/start-selenium-linux.sh
```
3. Click the Start Menu -> Preferences -> LXQt Settings -> Session Settings
4. Click the Autostart tab
5. Click Add
6. In the name field, enter an identifier (start-selenium)
7. In the command field, enter
```bash
bash ~/selenium/start-selenium-linux.sh
```
8. Test it works by signing out and signing back in, or restarting

---

The following instructions are general steps to set up a Selenium hub if not using Proxmox.

The Hub acts as the distributor of tests to the Nodes. While the hub can be on any device, 
it can be easiest to set up your work machine as the hub. 
The Hub must be able to communicate with the Nodes and vice versa over the network.

1. ***[Download the latest Selenium Server (Grid) jar file](https://www.selenium.dev/downloads/)***

2. ***Start the Selenium Hub***
    ```bash
    cd /path/to/selenium/jar/
    java -jar selenium-server-<version>.jar hub
    ```
   
3. ***Test the Hub is operational by browsing to the Selenium Grid UI***
    `http://localhost:4444/ui/` OR
    `http://<ip_address_of_hub_machine>:4444/ui/`

---

**Selenium Node(s)**

A Grid can contain multiple Nodes. Each Node manages the slots for the available browsers of the machine where it is running.

1. ***Install the required browsers onto the node machine***

    * [Download and install the latest Chrome Browser](https://www.google.com/intl/en_au/chrome/)
    * [Download and install the latest Edge Browser](https://www.microsoft.com/en-us/edge/download?form=MA13FJ)
    * [Download and install the latest Firefox Browser](https://www.mozilla.org/en-US/firefox/new/)

2. ***Download the required browser drivers onto the node machine***
    
    *Note: There is a Beta feature called [Selenium Manager](https://www.selenium.dev/documentation/selenium_manager/) which handles acquiring the appropriate drivers automatically. It is advised to use this first before downloading drivers manually to avoid any version mismatches. Use of Selenium Manager is covered in the following steps. If you encounter driver related issues (browsers not opening is a common symptom) then the suggestion is to use manual drivers and follow the steps below.*

    If downloading manually, drivers will need to be placed on the PATH.

    From [Selenium Documentation](https://www.selenium.dev/documentation/webdriver/troubleshooting/errors/driver_location/) regarding driver location:

    ```bash
    # To see what directories are already on PATH, open a Command Prompt and execute:
    echo %PATH%

    # If the location to your driver is not already in a directory listed, you can add a new directory to PATH:
    setx PATH "%PATH%;C:\WebDriver\bin"

    # You can test if it has been added correctly by checking the version of the driver:
    chromedriver.exe --version
    ```

    The PATH can also be modified using Control Panel.
    
    1. In Search, search for and then select: System (Control Panel)
    2. Click the Advanced system settings link.
    3. Click Environment Variables. In the section System Variables find the PATH environment variable and select it.
    4. Click Edit. If the PATH environment variable does not exist, click New.
    5. In the Edit System Variable (or New System Variable) window, specify the value of the PATH environment variable.
    6. Click OK. Close all remaining windows by clicking OK.

    ***Download the drivers and add to the folder you placed on the PATH:***

    1. [Download the Chrome Driver](https://developer.chrome.com/docs/chromedriver/downloads) matching the version of the browser and your node machine's architecture
    2. [Download the Edge Driver](https://developer.microsoft.com/en-us/microsoft-edge/tools/webdriver/?form=MA13LH) matching the version of the browser and your node machine's architecture
    3. [Download the Gecko (Firefox) Driver](https://github.com/mozilla/geckodriver/releases) matching the version of the browser and your node machine's architecture

3. ***Register Nodes to the Hub***
   ```bash
   java -jar selenium-server-<version>.jar node --hub http://<hub-ip>:4444 --config <name_of_config_file>.toml --session-timeout 1200 --selenium-manager true
   ``` 

## Using Proxmox
Proxmox VMs have been created to simulate a student environment.
The following VMs are currently available as of 16 Jan 2025:
* Hub machine running on Windows 10
* Node machines:
    
    * 4x Windows 10 with the Windows Agent installed (on/off network)
    * 2x Windows 11 with the Windows Agent installed (on/off network)
    * 3x Windows 10 with the Browser Extension MV3 installed
    * 1x Windows 11 with the Windows Agent installed (log collecting)
    * 1x Linux VM with no agent installed, used as an IT Admin machine and the selenium hub

**Running tests on Proxmox**

1. Tunnel into the Proxmox environment on your machine:

```bash
gcloud compute ssh proxmox-002-qa-2f49-kcdc --project=fzo-qa --zone=us-central1-a --tunnel-through-iap -- -L 4444:192.168.10.117:4444
```

2. Execute the command on your machine:
```bash
npx mocha
```

The tests will run on the Proxmox VMs. You do not need to instruct the runner which VMs to send tests to as this is determined in the code.

By default the Zephyr tests will be obtained by the framework from the testCaseFolderName in Config.json.
Using the "folderName" argument will override this value. For example:

```bash
npx mocha --folderName="01.01.01.01 Block signature"

## Zephyr Integration

The Framework retrieves test cases from Zephyr Scale, matches the steps in the testStepLibrary.ts file against regular expressions, and then runs the appropriate function(s) to conduct the tests. 

See the following flow chart for a high level overview.

![alt text](image.png)

After the tests have run, a test cycle will be created in Zephyr Scale under the "Selenium Automated Cycles" folder in the ET project. 
An execution for each test case is added to the test cycle, with a pass/fail status attached.
Any error messages will be included in the execution.

## Google Chat Reporter

After the tests have run, a message will be posted to the Google Chat space `A | Linewize Agent Automation Reporter`, including:
1. Number of tests passed.
2. Number of tests failed.
3. A link to the test cycle in Zephyr Scale.

A message will also be posted to the Google Chat space if there was a failure in uploading the test cycle to Zephyr Scale.

## Agent Log Viewer
The Agent log viewer is a Java based webserver designed to make the Agent debug logs accessible from the selenium test scripts.

### Installation
On the test device (Admin access required):
1. Copy AgentLogViewer.java to any location
2. Copy log/index.html to the same location as AgentLogViewer
3. Compile the AgentLogViewer
```
javac AgentLogViewer
```
4. Run the server
```
java AgentLogViewer
```
By default, the server will use Port 8080. You can change the port using the "port=" parameter, for example:
```
java AgentLogViewer --port=8888
```

## Enrolment Server
To facilitate enrolment, installation and uninstallation tests, a java server is run with a basic html webpage. The webpage has fields and buttons that can be filled and cicked by a selenium test (or manually) to run the functions. There is output field showing the commands being sent (which can also be seen on the Java server's terminal window) and a print out of install.log post install.

### Installation
On the test device (Admin access required):
1. Copy Enrolment.java to any location (/Users/admin/selenium)
2. Copy enrolment.html to the same location as Enrolment.java
3. Compile the Enrolment server
```
javac Enrolment
```
By default, the server will use Port 8081. You can change the port using the "port=" parameter, for example:
```
java Enrolment --port=8888
```

The enrolment.html webpage can be accessed via http://127.0.0.1:8081/ or http://127.0.0.1:8081/enrolment.html.
```

## Schedule Proxmox (Selenium Hub/Admin Lubuntu VM)
First-Time Setup:
Follow these steps to set up SSH authentication and prepare for test execution. 

1. SSH into Proxmox host:
```
gcloud compute ssh proxmox-002-qa-2f49-kcdc --zone=us-central1-a --project=fzo-qa --tunnel-through-iap
```
2. Inside Proxmox Host Terminal, generate SSH key pair:
```
ssh-keygen -t rsa -b 4096  # Press Enter for all prompts
```
3. Copy the SSH key to the Lubuntu VM:
```
ssh-copy-id admin@192.168.10.117
```
4. Enter password when prompted (this will add the key to ~/.ssh/authorized_keys and prevent future prompts)


Before running the scripts, ensure they are executable:
```
chmod +x transfer_to_proxmox.sh
chmod +x schedule_proxmox.sh
```

Run the following script to transfer the automation code to the Selenium Hub/Admin VM:
```
./transfer_to_proxmox.sh 
```

To schedule an automated daily test run, execute the following script and enter the hour and minute when prompted:
```
./schedule_proxmox.sh
```