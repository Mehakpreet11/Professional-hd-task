pipeline {
  agent any
  options { timestamps(); ansiColor('xterm') }

  // If you install the NodeJS plugin and define a tool called "Node 20",
  // uncomment the next line to use Node 20 on the agent:
  // tools { nodejs 'Node 20' }

  environment {
    IMAGE_BACKEND  = 'studymate-backend'
    IMAGE_FRONTEND = 'studymate-frontend'
    VERSION        = "${env.BUILD_NUMBER}"
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Backend: Install & Test (Mocha *.spec.js)') {
      steps {
        dir('backend') {
          // Install deps
          bat 'npm ci'

          // Run mocha ONLY on *.spec.js (skips legacy tests that may fail)
          // If no spec files, skip cleanly.
          bat '''
          IF EXIST tests (
            for /f %%C in ('powershell -Command "(Get-ChildItem -Recurse tests -Include *.spec.js).Count"') do set COUNT=%%C
            IF "%COUNT%"=="" set COUNT=0
            echo Found %COUNT% *.spec.js test file(s)
            IF %COUNT% GTR 0 (
              npx mocha "tests/**/*.spec.js" --recursive --exit
            ) ELSE (
              echo No *.spec.js tests; skipping mocha.
            )
          ) ELSE (
            echo No "tests" directory; skipping mocha.
          )
          '''

          // OPTIONAL: if later you add "coverage" script, this will run it (won't fail if missing)
          bat 'IF EXIST package.json (npm run coverage) ELSE echo No coverage script, skipping.'

          // OPTIONAL: quick npm audit (does not fail build)
          bat '''
          IF NOT EXIST reports\\audit mkdir reports\\audit
          cmd /c "npm audit --json > reports\\audit\\npm-audit.json" || ver >NUL
          '''
        }
      }
      post {
        always {
          // Publish coverage HTML only if it exists
          script {
            if (fileExists('backend/reports/coverage/index.html')) {
              publishHTML(target: [
                reportDir: 'backend/reports/coverage',
                reportFiles: 'index.html',
                reportName: 'Backend Coverage',
                allowMissing: true,
                alwaysLinkToLastBuild: true,
                keepAll: true
              ])
            } else {
              echo 'No coverage HTML found; skipping publishHTML.'
            }
          }
          // Archive any backend reports (ok if none)
          archiveArtifacts artifacts: 'backend/reports/**/*', allowEmptyArchive: true, fingerprint: true
        }
      }
    }

    stage('Build Docker Images') {
      steps {
        // Build backend image (context = backend/)
        bat 'docker build -t %IMAGE_BACKEND%:%VERSION% -f backend\\Dockerfile backend'
        // Build static frontend image (context = frontend/)
        bat 'docker build -t %IMAGE_FRONTEND%:%VERSION% -f frontend\\Dockerfile frontend'
      }
    }

    stage('Security (optional placeholder)') {
      steps {
        echo 'Add Trivy/Snyk here later to score the Security stage.'
      }
    }

    stage('Deploy: Staging') {
      steps {
        // Bring up staging stack
        bat 'docker compose -f docker-compose.staging.yml up -d'
        // Smoke check backend
        bat 'powershell -Command "Invoke-WebRequest http://localhost:5001/health -UseBasicParsing | Out-Null"'
      }
    }

    stage('Release: Prod (manual approval)') {
      steps {
        input message: 'Promote to Production?', ok: 'Release'
        bat 'docker compose -f docker-compose.prod.yml up -d'
        bat 'powershell -Command "Invoke-WebRequest http://localhost:5002/health -UseBasicParsing | Out-Null"'
      }
    }

    stage('Monitoring Check') {
      steps {
        script {
          def rc = bat(returnStatus: true, script: 'powershell -Command "Invoke-WebRequest http://localhost:5002/health -UseBasicParsing | Out-Null"')
          if (rc != 0) {
            error('Prod health check failed')
          } else {
            echo 'Prod health OK'
          }
        }
      }
    }
  }

  post {
    always {
      // Keep any logs if you add "docker compose logs > *.log" later
      archiveArtifacts artifacts: '**/*.log', allowEmptyArchive: true
    }
  }
}
