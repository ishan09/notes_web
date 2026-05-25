# Maven

## Core Concepts

### 1. Project Object Model (POM)
Maven projects are defined by `pom.xml` file.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <!-- Project coordinates -->
    <groupId>com.example</groupId>
    <artifactId>my-application</artifactId>
    <version>1.0.0-SNAPSHOT</version>
    <packaging>jar</packaging>

    <name>My Application</name>
    <description>A sample Spring Boot application</description>

    <!-- Properties -->
    <properties>
        <maven.compiler.source>11</maven.compiler.source>
        <maven.compiler.target>11</maven.compiler.target>
        <spring.boot.version>2.7.0</spring.boot.version>
        <junit.version>5.8.2</junit.version>
    </properties>

    <!-- Dependencies -->
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
            <version>${spring.boot.version}</version>
        </dependency>

        <dependency>
            <groupId>org.junit.jupiter</groupId>
            <artifactId>junit-jupiter</artifactId>
            <version>${junit.version}</version>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <!-- Build configuration -->
    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <version>${spring.boot.version}</version>
            </plugin>
        </plugins>
    </build>
</project>
```

### 2. Maven Coordinates
Every Maven artifact is uniquely identified by:

- **GroupId**: Organization/company (com.example)
- **ArtifactId**: Project name (my-app)
- **Version**: Release version (1.0.0)
- **Packaging**: Type of artifact (jar, war, pom)

### 3. Standard Directory Structure

```
my-project/
├── pom.xml
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/example/Application.java
│   │   ├── resources/
│   │   │   ├── application.properties
│   │   │   └── static/
│   │   └── webapp/ (for web applications)
│   └── test/
│       ├── java/
│       │   └── com/example/ApplicationTest.java
│       └── resources/
│           └── test-application.properties
└── target/ (generated)
    ├── classes/
    ├── test-classes/
    └── my-project-1.0.0.jar
```

### 4. Build Lifecycle

#### Default Lifecycle Phases
```bash
# Validate project structure
mvn validate

# Compile source code
mvn compile

# Run unit tests
mvn test

# Package compiled code (JAR/WAR)
mvn package

# Install package to local repository
mvn install

# Deploy to remote repository
mvn deploy
```

#### Clean Lifecycle
```bash
# Remove target directory
mvn clean

# Clean and compile
mvn clean compile

# Clean and package
mvn clean package
```

### 5. Dependency Management

#### Dependency Scopes
```xml
<dependencies>
    <!-- Compile scope (default) - available in all classpaths -->
    <dependency>
        <groupId>org.springframework</groupId>
        <artifactId>spring-core</artifactId>
        <version>5.3.21</version>
    </dependency>

    <!-- Test scope - only available during testing -->
    <dependency>
        <groupId>junit</groupId>
        <artifactId>junit</artifactId>
        <version>4.13.2</version>
        <scope>test</scope>
    </dependency>

    <!-- Provided scope - expected to be provided by runtime -->
    <dependency>
        <groupId>javax.servlet</groupId>
        <artifactId>servlet-api</artifactId>
        <version>2.5</version>
        <scope>provided</scope>
    </dependency>

    <!-- Runtime scope - not needed for compilation -->
    <dependency>
        <groupId>mysql</groupId>
        <artifactId>mysql-connector-java</artifactId>
        <version>8.0.29</version>
        <scope>runtime</scope>
    </dependency>
</dependencies>
```

#### Dependency Exclusions
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
    <exclusions>
        <exclusion>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-tomcat</artifactId>
        </exclusion>
    </exclusions>
</dependency>

<!-- Use Jetty instead of Tomcat -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-jetty</artifactId>
</dependency>
```

### 6. Parent POM and Inheritance

#### Parent POM
```xml
<!-- parent-pom.xml -->
<project>
    <modelVersion>4.0.0</modelVersion>

    <groupId>com.example</groupId>
    <artifactId>parent-pom</artifactId>
    <version>1.0.0</version>
    <packaging>pom</packaging>

    <properties>
        <java.version>11</java.version>
        <spring.boot.version>2.7.0</spring.boot.version>
    </properties>

    <dependencyManagement>
        <dependencies>
            <dependency>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-dependencies</artifactId>
                <version>${spring.boot.version}</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>
        </dependencies>
    </dependencyManagement>

    <build>
        <pluginManagement>
            <plugins>
                <plugin>
                    <groupId>org.apache.maven.plugins</groupId>
                    <artifactId>maven-compiler-plugin</artifactId>
                    <version>3.8.1</version>
                    <configuration>
                        <source>${java.version}</source>
                        <target>${java.version}</target>
                    </configuration>
                </plugin>
            </plugins>
        </pluginManagement>
    </build>
</project>
```

#### Child POM
```xml
<project>
    <modelVersion>4.0.0</modelVersion>

    <!-- Inherit from parent -->
    <parent>
        <groupId>com.example</groupId>
        <artifactId>parent-pom</artifactId>
        <version>1.0.0</version>
    </parent>

    <artifactId>child-project</artifactId>

    <dependencies>
        <!-- Version inherited from parent -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
    </dependencies>
</project>
```

### 7. Multi-Module Projects

#### Root POM
```xml
<project>
    <modelVersion>4.0.0</modelVersion>

    <groupId>com.example</groupId>
    <artifactId>multi-module-app</artifactId>
    <version>1.0.0</version>
    <packaging>pom</packaging>

    <modules>
        <module>core</module>
        <module>web</module>
        <module>data</module>
    </modules>

    <properties>
        <java.version>11</java.version>
    </properties>

    <dependencyManagement>
        <dependencies>
            <!-- Internal module dependencies -->
            <dependency>
                <groupId>com.example</groupId>
                <artifactId>core</artifactId>
                <version>${project.version}</version>
            </dependency>
            <dependency>
                <groupId>com.example</groupId>
                <artifactId>data</artifactId>
                <version>${project.version}</version>
            </dependency>
        </dependencies>
    </dependencyManagement>
</project>
```

#### Module Structure
```
multi-module-app/
├── pom.xml (root)
├── core/
│   ├── pom.xml
│   └── src/main/java/com/example/core/
├── data/
│   ├── pom.xml
│   └── src/main/java/com/example/data/
└── web/
    ├── pom.xml
    └── src/main/java/com/example/web/
```

### 8. Essential Plugins

#### Compiler Plugin
```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-compiler-plugin</artifactId>
    <version>3.8.1</version>
    <configuration>
        <source>11</source>
        <target>11</target>
        <compilerArgs>
            <arg>-parameters</arg>
        </compilerArgs>
    </configuration>
</plugin>
```

#### Surefire Plugin (Testing)
```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-surefire-plugin</artifactId>
    <version>3.0.0-M7</version>
    <configuration>
        <includes>
            <include>**/*Test.java</include>
            <include>**/*Tests.java</include>
        </includes>
        <excludes>
            <exclude>**/*IntegrationTest.java</exclude>
        </excludes>
    </configuration>
</plugin>
```

#### Failsafe Plugin (Integration Testing)
```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-failsafe-plugin</artifactId>
    <version>3.0.0-M7</version>
    <configuration>
        <includes>
            <include>**/*IT.java</include>
            <include>**/*IntegrationTest.java</include>
        </includes>
    </configuration>
    <executions>
        <execution>
            <goals>
                <goal>integration-test</goal>
                <goal>verify</goal>
            </goals>
        </execution>
    </executions>
</plugin>
```

### 9. Profiles
Environment-specific configurations.

```xml
<profiles>
    <!-- Development profile -->
    <profile>
        <id>dev</id>
        <activation>
            <activeByDefault>true</activeByDefault>
        </activation>
        <properties>
            <spring.profiles.active>dev</spring.profiles.active>
        </properties>
        <dependencies>
            <dependency>
                <groupId>com.h2database</groupId>
                <artifactId>h2</artifactId>
                <scope>runtime</scope>
            </dependency>
        </dependencies>
    </profile>

    <!-- Production profile -->
    <profile>
        <id>prod</id>
        <properties>
            <spring.profiles.active>prod</spring.profiles.active>
        </properties>
        <dependencies>
            <dependency>
                <groupId>mysql</groupId>
                <artifactId>mysql-connector-java</artifactId>
                <scope>runtime</scope>
            </dependency>
        </dependencies>
    </profile>

    <!-- Testing profile -->
    <profile>
        <id>test</id>
        <build>
            <plugins>
                <plugin>
                    <groupId>org.jacoco</groupId>
                    <artifactId>jacoco-maven-plugin</artifactId>
                    <version>0.8.7</version>
                    <executions>
                        <execution>
                            <goals>
                                <goal>prepare-agent</goal>
                            </goals>
                        </execution>
                        <execution>
                            <id>report</id>
                            <phase>test</phase>
                            <goals>
                                <goal>report</goal>
                            </goals>
                        </execution>
                    </executions>
                </plugin>
            </plugins>
        </build>
    </profile>
</profiles>
```

**Using profiles:**
```bash
# Activate specific profile
mvn clean package -Pprod

# Multiple profiles
mvn clean package -Ptest,integration

# Skip tests
mvn clean package -DskipTests
```

## Common Commands

### Building and Testing
```bash
# Clean and compile
mvn clean compile

# Run tests
mvn test

# Package application
mvn clean package

# Install to local repository
mvn clean install

# Skip tests during build
mvn clean package -DskipTests

# Run specific test
mvn test -Dtest=UserServiceTest

# Run tests with specific pattern
mvn test -Dtest=*ServiceTest
```

### Dependency Management
```bash
# Show dependency tree
mvn dependency:tree

# Analyze dependencies
mvn dependency:analyze

# Download sources
mvn dependency:sources

# Copy dependencies to target/dependency
mvn dependency:copy-dependencies

# Resolve dependencies
mvn dependency:resolve
```

### Information and Help
```bash
# Show effective POM
mvn help:effective-pom

# Show effective settings
mvn help:effective-settings

# Describe plugin
mvn help:describe -Dplugin=compiler

# Show available profiles
mvn help:all-profiles
```

## Common Interview Questions

### 1. What is Maven and what problems does it solve?
Maven is a build automation and project management tool that:
- Standardizes project structure
- Manages dependencies automatically
- Provides consistent build process
- Handles transitive dependencies
- Supports multi-module projects

### 2. Explain Maven lifecycle phases
**Default lifecycle:** validate → compile → test → package → verify → install → deploy

Each phase executes all previous phases automatically.

### 3. What is the difference between dependencyManagement and dependencies?
- **dependencies**: Actually adds dependencies to classpath
- **dependencyManagement**: Only declares versions, doesn't add to classpath

### 4. How do you resolve dependency conflicts?
```bash
# Find conflicts
mvn dependency:tree

# Exclude transitive dependency
<exclusions>
    <exclusion>
        <groupId>commons-logging</groupId>
        <artifactId>commons-logging</artifactId>
    </exclusion>
</exclusions>

# Force specific version
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>commons-logging</groupId>
            <artifactId>commons-logging</artifactId>
            <version>1.2</version>
        </dependency>
    </dependencies>
</dependencyManagement>
```

### 5. What are Maven repositories?
- **Local repository**: `~/.m2/repository`
- **Central repository**: Maven's default remote repository
- **Remote repositories**: Custom repositories (Nexus, Artifactory)

## Best Practices

### 1. Version Management
```xml
<properties>
    <!-- Use properties for version management -->
    <spring.version>5.3.21</spring.version>
    <junit.version>5.8.2</junit.version>
</properties>

<!-- Use BOM for related dependencies -->
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.springframework</groupId>
            <artifactId>spring-framework-bom</artifactId>
            <version>${spring.version}</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>
```

### 2. Plugin Configuration
```xml
<build>
    <pluginManagement>
        <plugins>
            <!-- Define plugin versions in parent POM -->
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <version>3.8.1</version>
                <configuration>
                    <source>${java.version}</source>
                    <target>${java.version}</target>
                </configuration>
            </plugin>
        </plugins>
    </pluginManagement>
</build>
```

### 3. Profile Best Practices
- Keep profiles minimal
- Use properties for configuration differences
- Test all profiles in CI/CD
- Document profile purposes

### 4. Dependency Best Practices
- Use specific versions (avoid SNAPSHOT in production)
- Minimize dependencies
- Regular dependency updates
- Use dependency scope appropriately

## Advanced Topics

### 1. Custom Plugins
```java
@Mojo(name = "greet", defaultPhase = LifecyclePhase.COMPILE)
public class GreetingMojo extends AbstractMojo {

    @Parameter(property = "greet.greeting", defaultValue = "Hello World!")
    private String greeting;

    public void execute() throws MojoExecutionException {
        getLog().info(greeting);
    }
}
```

### 2. Release Management
```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-release-plugin</artifactId>
    <version>3.0.0-M4</version>
    <configuration>
        <tagNameFormat>v@{project.version}</tagNameFormat>
        <autoVersionSubmodules>true</autoVersionSubmodules>
    </configuration>
</plugin>
```

```bash
# Prepare release
mvn release:prepare

# Perform release
mvn release:perform
```

### 3. Integration with IDEs
Most IDEs automatically recognize Maven projects and:
- Import dependencies
- Use Maven for building
- Support Maven goals execution
- Synchronize with POM changes

Remember to refresh/reimport when POM changes significantly!