pipeline {
  agent any
  options {
    timestamps()
    buildDiscarder(logRotator(numToKeepStr: '20'))
    ansiColor('xterm')
  }
  environment {
    // Node & Sonar names must match Jenkins tool config
    NODEJS_HOME = tool name: 'Node 20', type: 'jenkins.plugins.nodejs.tools.NodeJSInstallation'
    PATH = "${NODEJS_HOME}/bin:${env.PATH}"
    SONARQUBE_ENV = 'LocalSonar'
    APP_NAME = 'studymate'
    IMAGE_BACKEND = 'studymate-backend'
    IMAGE_FRONTEND = 'studymate-frontend'
    VERSION = "${env.BUILD_NUMBER}"
    GIT_SHA = sh(returnStdout: true, script: 'git rev-parse --short HEAD').trim()
  }
  stages {
    stage('Checkout') {
      steps {
        checkout scm
        script { currentBuild.displayName = "#${env.BUILD_NUMBER} ${env.GIT_SHA}" }
      }
    }

    stage('Install') {
      steps {
        dir('backend') {
          sh 'npm ci'
        }
        dir('frontend') {
          sh 'npm ci'
        }
      }
    }

    stage('Build') {
      steps {
        dir('frontend') {
          sh 'npm run build'
          // archive built frontend for artifacts
          archiveArtifacts artifacts: 'build/**', fingerprint: true
        }
      }
    }

    stage('Test') {
      steps {
        dir('backend') {
          sh 'npm run test:ci' // produces junit + coverage
        }
      }
      post {
        always {
          junit testResults: 'backend/reports/junit/*.xml', allowEmptyResults: true
          publishHTML([
            reportDir: 'backend/reports/coverage',
            reportFiles: 'index.html',
            reportName: 'Backend Coverage'
          ])
        }
      }
    }

    stage('Code Quality (ESLint + Sonar)') {
      steps {
        dir('backend') {
          sh 'npm run lint || true' // don't hard fail on lint; Sonar gate will do
          recordIssues enabledForFailure: true, tools: [eslint(pattern: 'reports/eslint/*.json')]
        }
        withSonarQubeEnv("${SONARQUBE_ENV}") {
          sh 'sonar-scanner -Dsonar.projectKey=studymate -Dsonar.projectBaseDir=.'
        }
      }
    }

    stage('Security (npm audit + Trivy)') {
      steps {
        dir('backend') {
          sh 'npm audit --json > reports/audit.json || true'
          archiveArtifacts artifacts: 'reports/audit.json', fingerprint: true
          // optional: fail on high vulns
          sh '''
            node -e "
              const r=require('./reports/audit.json');
              const highs=(r.vulnerabilities||{}).high||0;
              const criticals=(r.vulnerabilities||{}).critical||0;
              if(highs+criticals>0){ 
                console.log('Found high/critical vulnerabilities:', highs, criticals); 
              }
            "
          '''
        }
        // Build images for scan
        sh 'docker build -t ${IMAGE_BACKEND}:${GIT_SHA} -f backend/Dockerfile .'
        sh 'docker build -t ${IMAGE_FRONTEND}:${GIT_SHA} -f frontend/Dockerfile .'
        // Trivy scan (requires trivy installed on the agent)
        sh 'trivy image --exit-code 0 --severity HIGH,CRITICAL ${IMAGE_BACKEND}:${GIT_SHA} > trivy-backend.txt || true'
        sh 'trivy image --exit-code 0 --severity HIGH,CRITICAL ${IMAGE_FRONTEND}:${GIT_SHA} > trivy-frontend.txt || true'
        archiveArtifacts artifacts: 'trivy-*.txt', fingerprint: true
      }
    }

    stage('Docker Build & Tag') {
      steps {
        sh 'docker tag ${IMAGE_BACKEND}:${GIT_SHA} ${IMAGE_BACKEND}:${VERSION}'
        sh 'docker tag ${IMAGE_FRONTEND}:${GIT_SHA} ${IMAGE_FRONTEND}:${VERSION}'
      }
    }

    stage('Deploy: Staging') {
      steps {
        sh 'docker compose -f docker-compose.staging.yml up -d'
        // Smoke checks
        sh 'curl -fsS http://localhost:5001/health || (docker compose -f docker-compose.staging.yml logs --no-color > staging-logs.txt && false)'
        archiveArtifacts artifacts: 'staging-logs.txt', allowEmptyArchive: true
      }
    }

    stage('Release: Promote to Prod') {
      when { expression { return params?.AUTO_RELEASE == true || env.BRANCH_NAME == 'main' } }
      steps {
        input message: 'Promote this build to Production?', ok: 'Release'
        sh 'docker compose -f docker-compose.prod.yml up -d'
        sh 'curl -fsS http://localhost:5002/health || (docker compose -f docker-compose.prod.yml logs --no-color > prod-logs.txt && false)'
        archiveArtifacts artifacts: 'prod-logs.txt', allowEmptyArchive: true
      }
    }

    stage('Monitoring & Alerting (quick check)') {
      steps {
        script {
          def ok1 = sh(returnStatus: true, script: 'curl -fsS http://localhost:5002/metrics > /dev/null') == 0
          def ok2 = sh(returnStatus: true, script: 'curl -fsS http://localhost:5002/health > /dev/null') == 0
          if (!ok1 || !ok2) {
            emailext subject: "❗Prod health check failed: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                     body: "Health/metrics check failed. See build ${env.BUILD_URL}",
                     to: "you@example.com"
            error("Monitoring check failed")
          }
        }
      }
    }
  }
  post {
    always {
      archiveArtifacts artifacts: 'backend/reports/**/*, frontend/build/**/*', allowEmptyArchive: true
    }
  }
}
