# hotel-reservation-system

```json
Admin = {
    "name": "",
    "email": "",
    "phone": "",
    "accountType": Admin
    "account": {
        "username": "",
        "password": "",
        "status": Active
    }
    "address": {
        "street": "",
        "city": "",
        "postalCode": "",
        "country": ""
    }
}

Manager = {
    "name": "",
    "email": "",
    "phone": "",
    "accountType": Manager
    "account": {
        "username": "",
        "password": "",
        "status": Active
    }
    "address": {
        "street": "",
        "city": "",
        "postalCode": "",
        "country": ""
    }
    "hotel": Hotel
}

Guest = {
    "name": "",
    "email": "",
    "phone": "",
    "accountType": Guest
    "account": {
        "username": "",
        "password": "",
        "status": Active
    }
    "address": {
        "street": "",
        "city": "",
        "postalCode": "",
        "country": ""
    }
    "creditCard": CreditCard
}

CreditCard = {
    "nameOnCard": "",
    "cardNumber": "",
    "ccvNumber": 123,
    "postalCode": ""
}

SystemRequests = {
    "username": "",
    "name: ""
    "accessCode": "",
    "satus": RequestStatus
}

Hotel = {
    "name": "",
    "description": "",
    "address": {
        "street": "",
        "city": "",
        "postalCode": "",
        "country": ""
    }
    "rooms": [
        Room, 
    ]
}

Room = {
    "roomNumber": "",
    "type": RoomType,
    "status": RoomStatus
    "price": 123.123
    "description": ""
    "reviews": [
        Review,
    ]
}

Reservation = {
    "reservationNumber": "",
    "reservationDate": DateTime,
    "durationInDays": 123,
    "checkIn": DateTime,
    "checkOut": DateTime,
    "status": BookingStatus,
    "notifications": [
        Notification,
    ]
    "room": Room,
    "guest": Guest
    "payment": Payment
}

Review = {
    "guestName": "",
    "rating": 1,
    "feedback": ""
}

Notification = {
    "notificationType": NotificationType,
    "notificationStatus": NotificationStatus,
    "email": "",
    "content": "",
    "guestName": ""
}

Payment = {
    "paymentType": PaymentType,
    "amount": 123.123,
    "status": PaymentStatus,
    "creditCard": CreditCard
    "authorizationService": AuthorizationService
}
```